import React, { useState, useEffect, useRef } from 'react';
import config from '../config';
import { apiClient } from '../apiClient';
import './UploadStatusTracker.css';

export default function UploadStatusTracker() {
  const [uploads, setUploads] = useState([]);
  const [expandedUploadId, setExpandedUploadId] = useState(null);
  const pollingIntervalRef = useRef(null);
  const stopTimeoutRef = useRef(null);

  useEffect(() => {
    const handleUploadStarted = (e) => {
      const { uploadId, candidateId, fileName } = e.detail;
      setUploads((prev) => {
        if (prev.some((u) => u.uploadId === uploadId)) return prev;
        return [
          ...prev,
          {
            uploadId,
            candidateId,
            fileName,
            status: 'received',
            currentStage: 'received',
            errorMessage: null,
            progress: 16,
          },
        ];
      });
    };

    window.addEventListener('upload-started', handleUploadStarted);
    return () => window.removeEventListener('upload-started', handleUploadStarted);
  }, []);

  const getStageProgress = (stage) => {
    const stages = ['received', 'validated', 'queued', 'processing', 'indexed', 'completed'];
    const idx = stages.indexOf(stage?.toLowerCase());
    if (idx === -1) return 100;
    return Math.round(((idx + 1) / 6) * 100);
  };

  const pollStatuses = async () => {
    setUploads((currentUploads) => {
      const nextUploads = [...currentUploads];
      let hasChange = false;

      Promise.all(
        nextUploads.map(async (u, idx) => {
          if (u.status === 'completed' || u.status === 'failed') return;
          try {
            const res = await apiClient(`${config.orchestratorUrl}/orchestrator/status/${u.uploadId}`);
            if (res.ok) {
              const match = await res.json();
              if (match) {
                hasChange = true;
                nextUploads[idx] = {
                  ...u,
                  status: match.status,
                  currentStage: match.current_stage,
                  errorMessage: match.error_message,
                  progress: match.status === 'failed' ? 100 : getStageProgress(match.current_stage),
                  candidateId: match.candidate_id,
                };
              }
            }
          } catch (err) {
            console.error('Failed to poll status:', err);
          }
        })
      ).then(() => {
        if (hasChange) {
          setUploads(nextUploads);
        }
      });

      return currentUploads;
    });
  };

  useEffect(() => {
    const activeUploads = uploads.filter((u) => u.status !== 'completed' && u.status !== 'failed');

    if (activeUploads.length > 0) {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(pollStatuses, 3000);
      }
    } else if (uploads.length > 0 && !stopTimeoutRef.current && pollingIntervalRef.current) {
      stopTimeoutRef.current = setTimeout(() => {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }, 10000);
    }

    return () => {};
  }, [uploads]);

  if (uploads.length === 0) return null;

  return (
    <div className="upload-status-tracker-container">
      <div className="tracker-header">
        <span>Upload Status Tracker</span>
      </div>
      <div className="tracker-list">
        {uploads.map((u) => {
          const isFailed = u.status === 'failed';
          const isCompleted = u.status === 'completed';
          const isExpanded = expandedUploadId === u.uploadId;

          return (
            <div
              key={u.uploadId}
              className={`tracker-item ${isFailed ? 'failed' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => isFailed && setExpandedUploadId(isExpanded ? null : u.uploadId)}
              style={{ cursor: isFailed ? 'pointer' : 'default' }}
            >
              <div className="item-row">
                <span className="file-name" title={u.fileName}>
                  {u.fileName.length > 20 ? `${u.fileName.slice(0, 17)}...` : u.fileName}
                </span>
                <span className={`stage-pill stage-${u.status}`}>
                  {u.currentStage || u.status}
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className={`progress-fill ${isFailed ? 'failed' : ''} ${isCompleted ? 'completed' : ''}`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {isExpanded && isFailed && (
                <div className="error-details">
                  <strong>Error:</strong> {u.errorMessage || 'Auto-extraction failed.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
