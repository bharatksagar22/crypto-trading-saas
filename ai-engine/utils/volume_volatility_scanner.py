"""
Volume and Volatility Scanner Module
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import asyncio
import aiohttp
import statistics

logger = logging.getLogger(__name__)

@dataclass
class VolumeData:
    symbol: str
    current_volume: float
    avg_volume_24h: float
    volume_ratio: float
    volume_spike: bool
    volume_trend: str  # 'increasing', 'decreasing', 'stable'
    timestamp: datetime

@dataclass
class VolatilityData:
    symbol: str
    current_volatility: float
    avg_volatility_7d: float
    volatility_percentile: float
    volatility_trend: str
    atr: float  # Average True Range
    timestamp: datetime

class VolumeVolatilityScanner:
    def __init__(self, config: Dict):
        self.config = config
        self.volume_spike_threshold = config.get('volume_spike_threshold', 2.0)  # 2x average
        self.high_volatility_threshold = config.get('high_volatility_threshold', 0.05)  # 5%
        self.api_endpoints = {
            'binance': 'https://api.binance.com/api/v3',
            'coingecko': 'https://api.coingecko.com/api/v3'
        }
        
    async def get_volume_data(self, symbol: str, timeframe: str = '24h') -> VolumeData:
        """
        Get comprehensive volume data for a symbol
        """
        try:
            # Get current and historical volume data
            current_volume = await self.get_current_volume(symbol)
            historical_volumes = await self.get_historical_volumes(symbol, days=7)
            
            if not historical_volumes:
                return VolumeData(
                    symbol=symbol,
                    current_volume=current_volume,
                    avg_volume_24h=current_volume,
                    volume_ratio=1.0,
                    volume_spike=False,
                    volume_trend='stable',
                    timestamp=datetime.now()
                )
            
            # Calculate average volume
            avg_volume_24h = statistics.mean(historical_volumes[-24:]) if len(historical_volumes) >= 24 else statistics.mean(historical_volumes)
            
            # Calculate volume ratio
            volume_ratio = current_volume / avg_volume_24h if avg_volume_24h > 0 else 1.0
            
            # Detect volume spike
            volume_spike = volume_ratio >= self.volume_spike_threshold
            
            # Determine volume trend
            volume_trend = self.calculate_volume_trend(historical_volumes)
            
            return VolumeData(
                symbol=symbol,
                current_volume=current_volume,
                avg_volume_24h=avg_volume_24h,
                volume_ratio=volume_ratio,
                volume_spike=volume_spike,
                volume_trend=volume_trend,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error getting volume data for {symbol}: {e}")
            return VolumeData(
                symbol=symbol,
                current_volume=0,
                avg_volume_24h=0,
                volume_ratio=1.0,
                volume_spike=False,
                volume_trend='stable',
                timestamp=datetime.now()
            )
    
    async def get_volatility_data(self, symbol: str) -> VolatilityData:
        """
        Get comprehensive volatility data for a symbol
        """
        try:
            # Get historical price data
            price_data = await self.get_historical_prices(symbol, days=30)
            
            if len(price_data) < 7:
                return VolatilityData(
                    symbol=symbol,
                    current_volatility=0.02,
                    avg_volatility_7d=0.02,
                    volatility_percentile=50.0,
                    volatility_trend='stable',
                    atr=0.0,
                    timestamp=datetime.now()
                )
            
            # Calculate volatilities
            current_volatility = self.calculate_current_volatility(price_data[-24:])
            volatilities_7d = [self.calculate_current_volatility(price_data[i:i+24]) 
                             for i in range(len(price_data)-24) if i+24 <= len(price_data)]
            
            avg_volatility_7d = statistics.mean(volatilities_7d) if volatilities_7d else current_volatility
            
            # Calculate volatility percentile
            all_volatilities = volatilities_7d + [current_volatility]
            volatility_percentile = (sorted(all_volatilities).index(current_volatility) / len(all_volatilities)) * 100
            
            # Calculate ATR (Average True Range)
            atr = self.calculate_atr(price_data[-14:])  # 14-day ATR
            
            # Determine volatility trend
            volatility_trend = self.calculate_volatility_trend(volatilities_7d)
            
            return VolatilityData(
                symbol=symbol,
                current_volatility=current_volatility,
                avg_volatility_7d=avg_volatility_7d,
                volatility_percentile=volatility_percentile,
                volatility_trend=volatility_trend,
                atr=atr,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error getting volatility data for {symbol}: {e}")
            return VolatilityData(
                symbol=symbol,
                current_volatility=0.02,
                avg_volatility_7d=0.02,
                volatility_percentile=50.0,
                volatility_trend='stable',
                atr=0.0,
                timestamp=datetime.now()
            )
    
    async def get_current_volume(self, symbol: str) -> float:
        """
        Get current 24h volume for a symbol
        """
        try:
            # Try Binance API first
            url = f"{self.api_endpoints['binance']}/ticker/24hr"
            params = {'symbol': f"{symbol}USDT"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return float(data.get('volume', 0))
                    
            # Fallback to CoinGecko
            return await self.get_coingecko_volume(symbol)
            
        except Exception as e:
            logger.error(f"Error getting current volume for {symbol}: {e}")
            return 0.0
    
    async def get_coingecko_volume(self, symbol: str) -> float:
        """
        Get volume data from CoinGecko API
        """
        try:
            # Map symbol to CoinGecko ID
            symbol_map = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'ADA': 'cardano',
                'SOL': 'solana',
                'DOT': 'polkadot',
                'MATIC': 'matic-network',
                'AVAX': 'avalanche-2'
            }
            
            coin_id = symbol_map.get(symbol, symbol.lower())
            url = f"{self.api_endpoints['coingecko']}/coins/{coin_id}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        market_data = data.get('market_data', {})
                        return float(market_data.get('total_volume', {}).get('usd', 0))
                        
        except Exception as e:
            logger.error(f"Error getting CoinGecko volume for {symbol}: {e}")
            
        return 0.0
    
    async def get_historical_volumes(self, symbol: str, days: int = 7) -> List[float]:
        """
        Get historical volume data
        """
        try:
            # Try Binance klines API
            url = f"{self.api_endpoints['binance']}/klines"
            params = {
                'symbol': f"{symbol}USDT",
                'interval': '1h',
                'limit': days * 24
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        volumes = [float(kline[5]) for kline in data]  # Volume is at index 5
                        return volumes
                        
        except Exception as e:
            logger.error(f"Error getting historical volumes for {symbol}: {e}")
            
        return []
    
    async def get_historical_prices(self, symbol: str, days: int = 30) -> List[Dict]:
        """
        Get historical price data (OHLC)
        """
        try:
            url = f"{self.api_endpoints['binance']}/klines"
            params = {
                'symbol': f"{symbol}USDT",
                'interval': '1h',
                'limit': days * 24
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        prices = []
                        for kline in data:
                            prices.append({
                                'timestamp': kline[0],
                                'open': float(kline[1]),
                                'high': float(kline[2]),
                                'low': float(kline[3]),
                                'close': float(kline[4]),
                                'volume': float(kline[5])
                            })
                        return prices
                        
        except Exception as e:
            logger.error(f"Error getting historical prices for {symbol}: {e}")
            
        return []
    
    def calculate_current_volatility(self, price_data: List[Dict]) -> float:
        """
        Calculate current volatility using standard deviation of returns
        """
        if len(price_data) < 2:
            return 0.02  # Default 2%
            
        try:
            closes = [p['close'] for p in price_data]
            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            
            if not returns:
                return 0.02
                
            volatility = statistics.stdev(returns) if len(returns) > 1 else abs(returns[0])
            return volatility
            
        except Exception as e:
            logger.error(f"Error calculating volatility: {e}")
            return 0.02
    
    def calculate_atr(self, price_data: List[Dict], period: int = 14) -> float:
        """
        Calculate Average True Range (ATR)
        """
        if len(price_data) < 2:
            return 0.0
            
        try:
            true_ranges = []
            
            for i in range(1, len(price_data)):
                current = price_data[i]
                previous = price_data[i-1]
                
                tr1 = current['high'] - current['low']
                tr2 = abs(current['high'] - previous['close'])
                tr3 = abs(current['low'] - previous['close'])
                
                true_range = max(tr1, tr2, tr3)
                true_ranges.append(true_range)
            
            # Calculate ATR as simple moving average of true ranges
            atr_period = min(period, len(true_ranges))
            atr = statistics.mean(true_ranges[-atr_period:])
            
            return atr
            
        except Exception as e:
            logger.error(f"Error calculating ATR: {e}")
            return 0.0
    
    def calculate_volume_trend(self, volumes: List[float]) -> str:
        """
        Calculate volume trend over time
        """
        if len(volumes) < 3:
            return 'stable'
            
        try:
            # Compare recent volumes with earlier volumes
            recent_avg = statistics.mean(volumes[-6:])  # Last 6 hours
            earlier_avg = statistics.mean(volumes[-12:-6])  # 6-12 hours ago
            
            if recent_avg > earlier_avg * 1.2:
                return 'increasing'
            elif recent_avg < earlier_avg * 0.8:
                return 'decreasing'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Error calculating volume trend: {e}")
            return 'stable'
    
    def calculate_volatility_trend(self, volatilities: List[float]) -> str:
        """
        Calculate volatility trend over time
        """
        if len(volatilities) < 3:
            return 'stable'
            
        try:
            # Compare recent volatilities with earlier ones
            recent_avg = statistics.mean(volatilities[-3:])
            earlier_avg = statistics.mean(volatilities[-6:-3])
            
            if recent_avg > earlier_avg * 1.3:
                return 'increasing'
            elif recent_avg < earlier_avg * 0.7:
                return 'decreasing'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Error calculating volatility trend: {e}")
            return 'stable'
    
    async def scan_multiple_symbols(self, symbols: List[str]) -> Dict:
        """
        Scan volume and volatility for multiple symbols
        """
        results = {
            'volume_spikes': [],
            'high_volatility': [],
            'low_volatility': [],
            'volume_leaders': [],
            'timestamp': datetime.now()
        }
        
        try:
            # Get data for all symbols concurrently
            volume_tasks = [self.get_volume_data(symbol) for symbol in symbols]
            volatility_tasks = [self.get_volatility_data(symbol) for symbol in symbols]
            
            volume_results = await asyncio.gather(*volume_tasks, return_exceptions=True)
            volatility_results = await asyncio.gather(*volatility_tasks, return_exceptions=True)
            
            # Process results
            for i, symbol in enumerate(symbols):
                try:
                    volume_data = volume_results[i]
                    volatility_data = volatility_results[i]
                    
                    if isinstance(volume_data, Exception) or isinstance(volatility_data, Exception):
                        continue
                    
                    # Check for volume spikes
                    if volume_data.volume_spike:
                        results['volume_spikes'].append({
                            'symbol': symbol,
                            'volume_ratio': volume_data.volume_ratio,
                            'current_volume': volume_data.current_volume,
                            'trend': volume_data.volume_trend
                        })
                    
                    # Check for high volatility
                    if volatility_data.current_volatility > self.high_volatility_threshold:
                        results['high_volatility'].append({
                            'symbol': symbol,
                            'volatility': volatility_data.current_volatility,
                            'percentile': volatility_data.volatility_percentile,
                            'trend': volatility_data.volatility_trend
                        })
                    
                    # Check for low volatility (potential breakout candidates)
                    elif volatility_data.volatility_percentile < 20:
                        results['low_volatility'].append({
                            'symbol': symbol,
                            'volatility': volatility_data.current_volatility,
                            'percentile': volatility_data.volatility_percentile,
                            'atr': volatility_data.atr
                        })
                    
                    # Volume leaders
                    results['volume_leaders'].append({
                        'symbol': symbol,
                        'volume_ratio': volume_data.volume_ratio,
                        'current_volume': volume_data.current_volume
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing results for {symbol}: {e}")
                    continue
            
            # Sort volume leaders by volume ratio
            results['volume_leaders'].sort(key=lambda x: x['volume_ratio'], reverse=True)
            results['volume_leaders'] = results['volume_leaders'][:10]  # Top 10
            
        except Exception as e:
            logger.error(f"Error in multi-symbol scan: {e}")
        
        return results
    
    def get_trading_signals(self, volume_data: VolumeData, volatility_data: VolatilityData) -> Dict:
        """
        Generate trading signals based on volume and volatility analysis
        """
        signals = {
            'breakout_potential': 0.0,
            'momentum_strength': 0.0,
            'risk_level': 'medium',
            'recommended_action': 'hold',
            'confidence': 0.0
        }
        
        try:
            # Breakout potential (low volatility + volume spike)
            if volatility_data.volatility_percentile < 30 and volume_data.volume_spike:
                signals['breakout_potential'] = 0.8
                signals['recommended_action'] = 'watch'
                
            # Momentum strength (high volume + increasing trend)
            momentum_score = 0.0
            if volume_data.volume_ratio > 1.5:
                momentum_score += 0.3
            if volume_data.volume_trend == 'increasing':
                momentum_score += 0.2
            if volatility_data.volatility_trend == 'increasing':
                momentum_score += 0.2
                
            signals['momentum_strength'] = momentum_score
            
            # Risk level assessment
            if volatility_data.current_volatility > 0.08:  # 8%
                signals['risk_level'] = 'high'
            elif volatility_data.current_volatility < 0.02:  # 2%
                signals['risk_level'] = 'low'
            else:
                signals['risk_level'] = 'medium'
            
            # Overall confidence
            confidence = 0.0
            if volume_data.volume_ratio > 1.0:
                confidence += 0.3
            if volatility_data.volatility_percentile > 20:
                confidence += 0.2
            if volume_data.volume_trend != 'stable':
                confidence += 0.2
                
            signals['confidence'] = min(confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Error generating trading signals: {e}")
        
        return signals

