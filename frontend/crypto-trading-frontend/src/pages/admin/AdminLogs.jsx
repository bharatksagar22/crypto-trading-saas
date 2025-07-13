import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { formatDate } from '../../lib/utils';
import api from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const [systemResponse, webhookResponse] = await Promise.all([
        api.get('/admin/logs'),
        api.get('/webhooks/logs')
      ]);
      
      setLogs(systemResponse.data.data);
      setWebhookLogs(webhookResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = async (type = 'system') => {
    try {
      const response = await api.get(`/admin/logs/download?type=${type}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-logs-${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogBadgeVariant = (level) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'outline';
      case 'success':
        return 'default';
      default:
        return 'outline';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.source?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesType = filterType === 'all' || log.type === filterType;
    
    return matchesSearch && matchesLevel && matchesType;
  });

  const filteredWebhookLogs = webhookLogs.filter(log => {
    const matchesSearch = log.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.event?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner text="Loading system logs..." />;
  }

  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor system activities and troubleshoot issues
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <Button
            onClick={() => downloadLogs('system')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download Logs</span>
          </Button>
          
          <Button
            onClick={fetchLogs}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs by message or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Log Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Logs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Logs</TabsTrigger>
        </TabsList>

        {/* System Logs */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>System Logs ({filteredLogs.length})</span>
              </CardTitle>
              <CardDescription>
                Application logs, errors, and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.level)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={getLogBadgeVariant(log.level)}>
                          {log.level?.toUpperCase()}
                        </Badge>
                        {log.type && (
                          <Badge variant="outline">
                            {log.type}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {log.message}
                      </p>
                      
                      {log.source && (
                        <p className="text-xs text-gray-500">
                          Source: {log.source}
                        </p>
                      )}
                      
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer">
                            Show details
                          </summary>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No logs found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Logs */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Webhook Logs ({filteredWebhookLogs.length})</span>
              </CardTitle>
              <CardDescription>
                Incoming webhook requests and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredWebhookLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.status === 'success' ? 'success' : 'error')}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {log.source}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {log.event}: {log.description}
                      </p>
                      
                      {log.responseTime && (
                        <p className="text-xs text-gray-500">
                          Response time: {log.responseTime}ms
                        </p>
                      )}
                      
                      {log.payload && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer">
                            Show payload
                          </summary>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredWebhookLogs.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No webhook logs found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Webhook activity will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLogs;

