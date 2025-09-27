import React, { useState } from 'react';

interface PerformanceMetrics {
  totalTime: number;
  base64Time: number;
  uploadTime: number;
  fileSize: number;
  uploadSpeed: number; // MB/s
}

interface UploadPerformanceMonitorProps {
  metrics?: PerformanceMetrics;
  className?: string;
}

export default function UploadPerformanceMonitor({ 
  metrics, 
  className = '' 
}: UploadPerformanceMonitorProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!metrics) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceRating = (speed: number) => {
    if (speed > 10) return { rating: 'Excellent', color: 'text-green-600' };
    if (speed > 5) return { rating: 'Good', color: 'text-blue-600' };
    if (speed > 2) return { rating: 'Fair', color: 'text-yellow-600' };
    return { rating: 'Slow', color: 'text-red-600' };
  };

  const performance = getPerformanceRating(metrics.uploadSpeed);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">Upload Complete</span>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Upload Speed:</span>
          <span className={`font-medium ${performance.color}`}>
            {metrics.uploadSpeed.toFixed(1)} MB/s ({performance.rating})
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">File Size:</span>
          <span className="font-medium">{formatSize(metrics.fileSize)}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Time:</span>
          <span className="font-medium">{formatTime(metrics.totalTime)}</span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Breakdown</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base64 Conversion:</span>
              <span className="font-medium">{formatTime(metrics.base64Time)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Network Upload:</span>
              <span className="font-medium">{formatTime(metrics.uploadTime)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Processing Overhead:</span>
              <span className="font-medium">
                {formatTime(metrics.totalTime - metrics.base64Time - metrics.uploadTime)}
              </span>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Performance Tips:</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              {metrics.uploadSpeed < 2 && (
                <li>• Consider compressing your file before upload</li>
              )}
              {metrics.base64Time > metrics.uploadTime && (
                <li>• Base64 conversion is taking longer than upload - check your device performance</li>
              )}
              {metrics.uploadTime > 5000 && (
                <li>• Network upload is slow - check your internet connection</li>
              )}
              {metrics.uploadSpeed > 5 && (
                <li>• Great upload speed! Your connection is performing well</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

