"""
Sentiment Analysis Module for News and Social Media
"""

import requests
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import re
from dataclasses import dataclass
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

@dataclass
class SentimentData:
    symbol: str
    sentiment_score: float  # -1 to 1
    confidence: float
    source: str
    timestamp: datetime
    headline: str
    impact_score: float

class SentimentAnalyzer:
    def __init__(self, config: Dict):
        self.config = config
        self.news_api_key = config.get('news_api_key')
        self.twitter_bearer_token = config.get('twitter_bearer_token')
        self.reddit_client_id = config.get('reddit_client_id')
        self.reddit_client_secret = config.get('reddit_client_secret')
        
        # Sentiment keywords
        self.positive_keywords = [
            'bullish', 'moon', 'pump', 'rally', 'surge', 'breakout', 'gains',
            'profit', 'buy', 'long', 'hodl', 'diamond hands', 'to the moon',
            'green', 'up', 'rise', 'increase', 'growth', 'adoption', 'partnership'
        ]
        
        self.negative_keywords = [
            'bearish', 'dump', 'crash', 'fall', 'drop', 'sell', 'short',
            'red', 'down', 'decline', 'loss', 'fear', 'panic', 'regulation',
            'ban', 'hack', 'scam', 'bubble', 'correction', 'liquidation'
        ]
        
        self.crypto_symbols = {
            'BTC': ['bitcoin', 'btc'],
            'ETH': ['ethereum', 'eth'],
            'BNB': ['binance', 'bnb'],
            'ADA': ['cardano', 'ada'],
            'SOL': ['solana', 'sol'],
            'DOT': ['polkadot', 'dot'],
            'MATIC': ['polygon', 'matic'],
            'AVAX': ['avalanche', 'avax']
        }
    
    def analyze_text_sentiment(self, text: str) -> Tuple[float, float]:
        """
        Analyze sentiment of text using keyword-based approach
        Returns (sentiment_score, confidence)
        """
        text_lower = text.lower()
        
        positive_count = sum(1 for keyword in self.positive_keywords if keyword in text_lower)
        negative_count = sum(1 for keyword in self.negative_keywords if keyword in text_lower)
        
        total_keywords = positive_count + negative_count
        
        if total_keywords == 0:
            return 0.0, 0.1  # Neutral with low confidence
        
        sentiment_score = (positive_count - negative_count) / total_keywords
        confidence = min(total_keywords / 10.0, 1.0)  # Max confidence at 10+ keywords
        
        return sentiment_score, confidence
    
    async def get_news_sentiment(self, symbol: str, hours_back: int = 24) -> List[SentimentData]:
        """
        Get news sentiment for a specific cryptocurrency
        """
        sentiments = []
        
        try:
            # Get symbol keywords
            keywords = self.crypto_symbols.get(symbol, [symbol.lower()])
            
            # NewsAPI request
            if self.news_api_key:
                url = "https://newsapi.org/v2/everything"
                params = {
                    'q': ' OR '.join(keywords),
                    'language': 'en',
                    'sortBy': 'publishedAt',
                    'from': (datetime.now() - timedelta(hours=hours_back)).isoformat(),
                    'apiKey': self.news_api_key
                }
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            for article in data.get('articles', [])[:20]:  # Limit to 20 articles
                                title = article.get('title', '')
                                description = article.get('description', '')
                                content = f"{title} {description}"
                                
                                sentiment_score, confidence = self.analyze_text_sentiment(content)
                                
                                # Calculate impact score based on source
                                source = article.get('source', {}).get('name', 'Unknown')
                                impact_score = self.calculate_source_impact(source)
                                
                                sentiments.append(SentimentData(
                                    symbol=symbol,
                                    sentiment_score=sentiment_score,
                                    confidence=confidence,
                                    source=f"News: {source}",
                                    timestamp=datetime.fromisoformat(article['publishedAt'].replace('Z', '+00:00')),
                                    headline=title,
                                    impact_score=impact_score
                                ))
                                
        except Exception as e:
            logger.error(f"Error fetching news sentiment for {symbol}: {e}")
        
        return sentiments
    
    async def get_social_sentiment(self, symbol: str) -> List[SentimentData]:
        """
        Get social media sentiment (Twitter, Reddit)
        """
        sentiments = []
        
        # Twitter sentiment (if API access available)
        if self.twitter_bearer_token:
            try:
                sentiments.extend(await self.get_twitter_sentiment(symbol))
            except Exception as e:
                logger.error(f"Error fetching Twitter sentiment: {e}")
        
        # Reddit sentiment
        try:
            sentiments.extend(await self.get_reddit_sentiment(symbol))
        except Exception as e:
            logger.error(f"Error fetching Reddit sentiment: {e}")
        
        return sentiments
    
    async def get_twitter_sentiment(self, symbol: str) -> List[SentimentData]:
        """
        Get Twitter sentiment for cryptocurrency
        """
        sentiments = []
        
        try:
            keywords = self.crypto_symbols.get(symbol, [symbol])
            query = ' OR '.join([f"#{keyword}" for keyword in keywords])
            
            url = "https://api.twitter.com/2/tweets/search/recent"
            headers = {"Authorization": f"Bearer {self.twitter_bearer_token}"}
            params = {
                'query': query,
                'max_results': 50,
                'tweet.fields': 'created_at,public_metrics'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        for tweet in data.get('data', []):
                            text = tweet.get('text', '')
                            sentiment_score, confidence = self.analyze_text_sentiment(text)
                            
                            # Weight by engagement
                            metrics = tweet.get('public_metrics', {})
                            engagement = metrics.get('like_count', 0) + metrics.get('retweet_count', 0)
                            impact_score = min(engagement / 100.0, 1.0)
                            
                            sentiments.append(SentimentData(
                                symbol=symbol,
                                sentiment_score=sentiment_score,
                                confidence=confidence,
                                source="Twitter",
                                timestamp=datetime.fromisoformat(tweet['created_at'].replace('Z', '+00:00')),
                                headline=text[:100] + "..." if len(text) > 100 else text,
                                impact_score=impact_score
                            ))
                            
        except Exception as e:
            logger.error(f"Error fetching Twitter sentiment: {e}")
        
        return sentiments
    
    async def get_reddit_sentiment(self, symbol: str) -> List[SentimentData]:
        """
        Get Reddit sentiment from cryptocurrency subreddits
        """
        sentiments = []
        
        try:
            # Reddit API authentication
            auth = aiohttp.BasicAuth(self.reddit_client_id, self.reddit_client_secret)
            data = {
                'grant_type': 'client_credentials'
            }
            
            async with aiohttp.ClientSession() as session:
                # Get access token
                async with session.post('https://www.reddit.com/api/v1/access_token',
                                      auth=auth, data=data,
                                      headers={'User-Agent': 'CryptoTradingBot/1.0'}) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        access_token = token_data['access_token']
                        
                        # Search relevant subreddits
                        subreddits = ['cryptocurrency', 'bitcoin', 'ethereum', 'cryptomarkets']
                        keywords = self.crypto_symbols.get(symbol, [symbol])
                        
                        headers = {
                            'Authorization': f'Bearer {access_token}',
                            'User-Agent': 'CryptoTradingBot/1.0'
                        }
                        
                        for subreddit in subreddits:
                            for keyword in keywords:
                                url = f"https://oauth.reddit.com/r/{subreddit}/search"
                                params = {
                                    'q': keyword,
                                    'sort': 'new',
                                    'limit': 25,
                                    't': 'day'
                                }
                                
                                async with session.get(url, headers=headers, params=params) as response:
                                    if response.status == 200:
                                        data = await response.json()
                                        
                                        for post in data.get('data', {}).get('children', []):
                                            post_data = post.get('data', {})
                                            title = post_data.get('title', '')
                                            selftext = post_data.get('selftext', '')
                                            content = f"{title} {selftext}"
                                            
                                            sentiment_score, confidence = self.analyze_text_sentiment(content)
                                            
                                            # Weight by upvotes and comments
                                            upvotes = post_data.get('ups', 0)
                                            comments = post_data.get('num_comments', 0)
                                            impact_score = min((upvotes + comments) / 100.0, 1.0)
                                            
                                            sentiments.append(SentimentData(
                                                symbol=symbol,
                                                sentiment_score=sentiment_score,
                                                confidence=confidence,
                                                source=f"Reddit: r/{subreddit}",
                                                timestamp=datetime.fromtimestamp(post_data.get('created_utc', 0)),
                                                headline=title,
                                                impact_score=impact_score
                                            ))
                                            
        except Exception as e:
            logger.error(f"Error fetching Reddit sentiment: {e}")
        
        return sentiments
    
    def calculate_source_impact(self, source: str) -> float:
        """
        Calculate impact score based on news source credibility
        """
        high_impact_sources = [
            'Reuters', 'Bloomberg', 'CoinDesk', 'Cointelegraph',
            'The Wall Street Journal', 'Financial Times', 'CNBC'
        ]
        
        medium_impact_sources = [
            'Yahoo Finance', 'MarketWatch', 'Decrypt', 'CoinGecko',
            'CryptoSlate', 'BeInCrypto'
        ]
        
        if any(source_name in source for source_name in high_impact_sources):
            return 1.0
        elif any(source_name in source for source_name in medium_impact_sources):
            return 0.7
        else:
            return 0.4
    
    def aggregate_sentiment(self, sentiments: List[SentimentData]) -> Dict:
        """
        Aggregate multiple sentiment data points into overall sentiment
        """
        if not sentiments:
            return {
                'overall_sentiment': 0.0,
                'confidence': 0.0,
                'positive_ratio': 0.0,
                'negative_ratio': 0.0,
                'neutral_ratio': 0.0,
                'total_sources': 0,
                'weighted_sentiment': 0.0
            }
        
        # Calculate weighted sentiment
        total_weight = 0
        weighted_sentiment = 0
        
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        
        for sentiment in sentiments:
            weight = sentiment.confidence * sentiment.impact_score
            weighted_sentiment += sentiment.sentiment_score * weight
            total_weight += weight
            
            if sentiment.sentiment_score > 0.1:
                positive_count += 1
            elif sentiment.sentiment_score < -0.1:
                negative_count += 1
            else:
                neutral_count += 1
        
        total_count = len(sentiments)
        overall_sentiment = weighted_sentiment / total_weight if total_weight > 0 else 0
        
        # Calculate confidence based on number of sources and agreement
        confidence = min(total_count / 20.0, 1.0)  # Max confidence at 20+ sources
        
        return {
            'overall_sentiment': overall_sentiment,
            'confidence': confidence,
            'positive_ratio': positive_count / total_count,
            'negative_ratio': negative_count / total_count,
            'neutral_ratio': neutral_count / total_count,
            'total_sources': total_count,
            'weighted_sentiment': overall_sentiment
        }
    
    async def get_comprehensive_sentiment(self, symbol: str) -> Dict:
        """
        Get comprehensive sentiment analysis from all sources
        """
        try:
            # Gather sentiment from all sources
            news_sentiments = await self.get_news_sentiment(symbol)
            social_sentiments = await self.get_social_sentiment(symbol)
            
            all_sentiments = news_sentiments + social_sentiments
            
            # Aggregate results
            result = self.aggregate_sentiment(all_sentiments)
            result['symbol'] = symbol
            result['timestamp'] = datetime.now()
            result['sources_breakdown'] = {
                'news_count': len(news_sentiments),
                'social_count': len(social_sentiments)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in comprehensive sentiment analysis: {e}")
            return {
                'symbol': symbol,
                'overall_sentiment': 0.0,
                'confidence': 0.0,
                'error': str(e)
            }

