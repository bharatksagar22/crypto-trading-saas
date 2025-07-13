const Trade = require('../models/Trade');
const User = require('../models/User');
const Strategy = require('../models/Strategy');
const fs = require('fs').promises;
const path = require('path');

// Generate comprehensive performance report
const generatePerformanceReport = async (userId, startDate, endDate) => {
  try {
    // Get all trades in the period
    const trades = await Trade.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'FILLED'
    }).sort({ createdAt: 1 });

    // Calculate basic metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.pnl > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate advanced metrics
    const metrics = calculateAdvancedMetrics(trades);

    // Get strategy performance
    const strategyPerformance = await getStrategyPerformance(userId, startDate, endDate);

    // Get coin performance
    const coinPerformance = await getCoinPerformance(userId, startDate, endDate);

    // Generate daily PnL data
    const dailyPnL = generateDailyPnLData(trades, startDate, endDate);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      totalPnL,
      winRate,
      ...metrics,
      strategyPerformance,
      coinPerformance,
      dailyPnL
    };
  } catch (error) {
    console.error('Performance report generation error:', error);
    throw error;
  }
};

// Calculate advanced trading metrics
const calculateAdvancedMetrics = (trades) => {
  if (trades.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      avgTradeSize: 0,
      avgHoldingTime: 0,
      profitFactor: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0
    };
  }

  const pnls = trades.map(trade => trade.pnl);
  const avgPnL = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;

  // Sharpe Ratio calculation
  const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnL, 2), 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgPnL / stdDev : 0;

  // Max Drawdown calculation
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnL = 0;

  trades.forEach(trade => {
    runningPnL += trade.pnl;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Average trade size
  const avgTradeSize = trades.reduce((sum, trade) => 
    sum + (trade.quantity * trade.executedPrice), 0) / trades.length;

  // Average holding time (in hours)
  const tradesWithTime = trades.filter(trade => trade.entryTime && trade.exitTime);
  const avgHoldingTime = tradesWithTime.length > 0 
    ? tradesWithTime.reduce((sum, trade) => 
        sum + (new Date(trade.exitTime) - new Date(trade.entryTime)), 0) 
      / tradesWithTime.length / (1000 * 60 * 60) : 0;

  // Profit Factor
  const winningPnL = trades.filter(trade => trade.pnl > 0)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const losingPnL = Math.abs(trades.filter(trade => trade.pnl < 0)
    .reduce((sum, trade) => sum + trade.pnl, 0));
  const profitFactor = losingPnL > 0 ? winningPnL / losingPnL : 0;

  // Consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  trades.forEach(trade => {
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else if (trade.pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    }
  });

  return {
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    avgTradeSize: Math.round(avgTradeSize * 100) / 100,
    avgHoldingTime: Math.round(avgHoldingTime * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxConsecutiveWins,
    maxConsecutiveLosses
  };
};

// Get strategy performance breakdown
const getStrategyPerformance = async (userId, startDate, endDate) => {
  try {
    const strategyData = await Trade.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: '$strategy',
          trades: { $sum: 1 },
          pnl: { $sum: '$pnl' },
          winningTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          avgConfidence: { $avg: '$confidenceScore' },
          totalVolume: { $sum: { $multiply: ['$quantity', '$executedPrice'] } }
        }
      },
      { $sort: { pnl: -1 } }
    ]);

    return strategyData.map(strategy => ({
      strategyName: strategy._id,
      trades: strategy.trades,
      pnl: Math.round(strategy.pnl * 100) / 100,
      winRate: Math.round((strategy.winningTrades / strategy.trades) * 10000) / 100,
      avgConfidence: Math.round(strategy.avgConfidence * 100) / 100,
      totalVolume: Math.round(strategy.totalVolume * 100) / 100
    }));
  } catch (error) {
    console.error('Strategy performance calculation error:', error);
    return [];
  }
};

// Get coin performance breakdown
const getCoinPerformance = async (userId, startDate, endDate) => {
  try {
    const coinData = await Trade.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'FILLED'
        }
      },
      {
        $group: {
          _id: '$symbol',
          trades: { $sum: 1 },
          pnl: { $sum: '$pnl' },
          winningTrades: { $sum: { $cond: [{ $gt: ['$pnl', 0] }, 1, 0] } },
          totalVolume: { $sum: { $multiply: ['$quantity', '$executedPrice'] } }
        }
      },
      { $sort: { pnl: -1 } }
    ]);

    return coinData.map(coin => ({
      symbol: coin._id,
      trades: coin.trades,
      pnl: Math.round(coin.pnl * 100) / 100,
      winRate: Math.round((coin.winningTrades / coin.trades) * 10000) / 100,
      totalVolume: Math.round(coin.totalVolume * 100) / 100
    }));
  } catch (error) {
    console.error('Coin performance calculation error:', error);
    return [];
  }
};

// Generate daily PnL data for charts
const generateDailyPnLData = (trades, startDate, endDate) => {
  try {
    const dailyData = {};
    
    // Initialize all dates with zero PnL
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        dailyPnL: 0,
        trades: 0,
        cumulativePnL: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual trade data
    trades.forEach(trade => {
      const dateStr = trade.createdAt.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].dailyPnL += trade.pnl;
        dailyData[dateStr].trades += 1;
      }
    });

    // Calculate cumulative PnL
    let cumulativePnL = 0;
    const sortedDates = Object.keys(dailyData).sort();
    
    sortedDates.forEach(date => {
      cumulativePnL += dailyData[date].dailyPnL;
      dailyData[date].cumulativePnL = Math.round(cumulativePnL * 100) / 100;
      dailyData[date].dailyPnL = Math.round(dailyData[date].dailyPnL * 100) / 100;
    });

    return Object.values(dailyData);
  } catch (error) {
    console.error('Daily PnL data generation error:', error);
    return [];
  }
};

// Generate PnL chart data for frontend
const generatePnLChart = async (userId, period = '30d') => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get trades
    const trades = await Trade.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'FILLED'
    }).sort({ createdAt: 1 });

    // Generate chart data
    const chartData = generateDailyPnLData(trades, startDate, endDate);

    // Prepare data for different chart types
    const lineChartData = {
      labels: chartData.map(item => item.date),
      datasets: [
        {
          label: 'Daily P&L',
          data: chartData.map(item => item.dailyPnL),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'Cumulative P&L',
          data: chartData.map(item => item.cumulativePnL),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    };

    const barChartData = {
      labels: chartData.map(item => item.date),
      datasets: [
        {
          label: 'Daily P&L',
          data: chartData.map(item => item.dailyPnL),
          backgroundColor: chartData.map(item => 
            item.dailyPnL >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
          ),
          borderColor: chartData.map(item => 
            item.dailyPnL >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
          ),
          borderWidth: 1
        }
      ]
    };

    return {
      lineChart: lineChartData,
      barChart: barChartData,
      summary: {
        totalDays: chartData.length,
        profitableDays: chartData.filter(item => item.dailyPnL > 0).length,
        totalPnL: chartData.reduce((sum, item) => sum + item.dailyPnL, 0),
        bestDay: Math.max(...chartData.map(item => item.dailyPnL)),
        worstDay: Math.min(...chartData.map(item => item.dailyPnL))
      }
    };
  } catch (error) {
    console.error('PnL chart generation error:', error);
    throw error;
  }
};

// Generate CSV report
const generateCSVReport = async (reportData, filePath) => {
  try {
    let csvContent = '';
    
    // Header
    csvContent += 'Crypto Trading Performance Report\n';
    csvContent += `Generated on: ${new Date().toISOString()}\n\n`;
    
    // Summary
    csvContent += 'SUMMARY\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Trades,${reportData.totalTrades}\n`;
    csvContent += `Winning Trades,${reportData.winningTrades}\n`;
    csvContent += `Losing Trades,${reportData.losingTrades}\n`;
    csvContent += `Win Rate,${reportData.winRate.toFixed(2)}%\n`;
    csvContent += `Total P&L,${reportData.totalPnL.toFixed(2)}\n`;
    csvContent += `Sharpe Ratio,${reportData.sharpeRatio}\n`;
    csvContent += `Max Drawdown,${reportData.maxDrawdown}\n`;
    csvContent += `Profit Factor,${reportData.profitFactor}\n\n`;
    
    // Strategy Performance
    csvContent += 'STRATEGY PERFORMANCE\n';
    csvContent += 'Strategy,Trades,P&L,Win Rate,Avg Confidence\n';
    reportData.strategyPerformance.forEach(strategy => {
      csvContent += `${strategy.strategyName},${strategy.trades},${strategy.pnl},${strategy.winRate}%,${strategy.avgConfidence}\n`;
    });
    csvContent += '\n';
    
    // Coin Performance
    csvContent += 'COIN PERFORMANCE\n';
    csvContent += 'Symbol,Trades,P&L,Win Rate,Volume\n';
    reportData.coinPerformance.forEach(coin => {
      csvContent += `${coin.symbol},${coin.trades},${coin.pnl},${coin.winRate}%,${coin.totalVolume}\n`;
    });
    csvContent += '\n';
    
    // Daily P&L
    csvContent += 'DAILY P&L\n';
    csvContent += 'Date,Daily P&L,Cumulative P&L,Trades\n';
    reportData.dailyPnL.forEach(day => {
      csvContent += `${day.date},${day.dailyPnL},${day.cumulativePnL},${day.trades}\n`;
    });
    
    // Write to file
    await fs.writeFile(filePath, csvContent, 'utf8');
    
    return filePath;
  } catch (error) {
    console.error('CSV report generation error:', error);
    throw error;
  }
};

// Generate PDF report (simplified - would use a proper PDF library)
const generatePDFReport = async (reportData, filePath) => {
  try {
    // This would typically use a library like puppeteer or jsPDF
    // For now, we'll create a simple HTML report that can be converted to PDF
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Trading Performance Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .metric { display: flex; justify-content: space-between; margin: 5px 0; }
            .section { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Trading Performance Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
            <h2>Performance Summary</h2>
            <div class="summary">
                <div class="metric"><span>Total Trades:</span><span>${reportData.totalTrades}</span></div>
                <div class="metric"><span>Win Rate:</span><span>${reportData.winRate.toFixed(2)}%</span></div>
                <div class="metric"><span>Total P&L:</span><span>$${reportData.totalPnL.toFixed(2)}</span></div>
                <div class="metric"><span>Sharpe Ratio:</span><span>${reportData.sharpeRatio}</span></div>
                <div class="metric"><span>Max Drawdown:</span><span>$${reportData.maxDrawdown}</span></div>
            </div>
        </div>
        
        <div class="section">
            <h2>Strategy Performance</h2>
            <table>
                <tr><th>Strategy</th><th>Trades</th><th>P&L</th><th>Win Rate</th></tr>
                ${reportData.strategyPerformance.map(strategy => 
                    `<tr><td>${strategy.strategyName}</td><td>${strategy.trades}</td><td>$${strategy.pnl}</td><td>${strategy.winRate}%</td></tr>`
                ).join('')}
            </table>
        </div>
        
        <div class="section">
            <h2>Coin Performance</h2>
            <table>
                <tr><th>Symbol</th><th>Trades</th><th>P&L</th><th>Win Rate</th></tr>
                ${reportData.coinPerformance.map(coin => 
                    `<tr><td>${coin.symbol}</td><td>${coin.trades}</td><td>$${coin.pnl}</td><td>${coin.winRate}%</td></tr>`
                ).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    
    // Write HTML file (in production, this would be converted to PDF)
    const htmlPath = filePath.replace('.pdf', '.html');
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
    
    return htmlPath;
  } catch (error) {
    console.error('PDF report generation error:', error);
    throw error;
  }
};

module.exports = {
  generatePerformanceReport,
  generatePnLChart,
  generateCSVReport,
  generatePDFReport,
  calculateAdvancedMetrics
};

