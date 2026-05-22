import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../../../contexts/SessionContext';
import { useToast } from '../../../components/Toast/ToastContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import type { TaskPreview } from '../../../types';

export const useTaskExecution = () => {
  const { selectedMobile, fetchSessions, setSelectedMobile, apiBase, wsBase } = useSession();
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [previewTasks, setPreviewTasks] = useState<TaskPreview[]>([]);
  const [concurrency, setConcurrency] = useState<number>(8);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<string[]>([]);
  const [showHistoryLogs, setShowHistoryLogs] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const fullLogsRef = useRef<string[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks`);
      setHistoryTasks(res.data);
    } catch (err) {
      console.error("Fetch history failed", err);
    }
  }, [apiBase]);

  const clearPersistence = useCallback(() => {
    localStorage.removeItem('currentTaskId');
    localStorage.removeItem('previewTasks');
    localStorage.removeItem('selectedMobile');
  }, []);

  const connectWebSocket = useCallback((taskId: string) => {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${wsBase}/api/ws/logs/${taskId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      // Append to full logs ref (which does not trigger re-render)
      fullLogsRef.current.push(event.data);
      
      // Roll logs state (keep only latest 300 rows for rendering performance)
      setLogs((prev) => {
        const next = [...prev, event.data];
        if (next.length > 300) {
          return next.slice(next.length - 300);
        }
        return next;
      });

      if (event.data.includes("任务执行完毕") || event.data.includes("强制停止")) {
        setIsTaskRunning(false);
        clearPersistence();
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };
  }, [wsBase, clearPersistence]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${apiBase}/api/tasks/parse-excel`, formData);
      setPreviewTasks(res.data.tasks);
      localStorage.setItem('previewTasks', JSON.stringify(res.data.tasks));
      addToast(`成功导入 ${res.data.tasks.length} 条任务`, "success");
    } catch (err: any) {
      addToast("上传失败: " + (err.response?.data?.detail || err.message), "error");
    }
  }, [apiBase, addToast]);

  const startTask = useCallback(async () => {
    if (!selectedMobile) return addToast("请先选择一个授权账号", "warning");
    if (previewTasks.length === 0) return addToast("请先上传 Excel 任务文件", "warning");

    try {
      // 1. Check session expiry
      const checkRes = await axios.get(`${apiBase}/api/auth/check-session/${selectedMobile}`);
      if (checkRes.data.status === 'expired') {
        addToast("授权已过期，请重新登录授权", "error");
        fetchSessions();
        setSelectedMobile('');
        return;
      }

      // 2. Start automation task
      const res = await axios.post(`${apiBase}/api/tasks/start?mobile=${selectedMobile}`, {
        tasks: previewTasks,
        concurrency: concurrency
      });
      const taskId = res.data.task_id;
      setCurrentTaskId(taskId);
      localStorage.setItem('currentTaskId', taskId);
      localStorage.setItem('selectedMobile', selectedMobile);
      localStorage.setItem('previewTasks', JSON.stringify(previewTasks));
      setIsTaskRunning(true);
      
      // Clear logs buffers
      setLogs([]);
      fullLogsRef.current = [];

      connectWebSocket(taskId);
      addToast("自动化任务已启动", "success");
    } catch (err: any) {
      addToast("启动失败: " + (err.response?.data?.detail || err.message), "error");
    }
  }, [selectedMobile, previewTasks, concurrency, apiBase, addToast, fetchSessions, setSelectedMobile, connectWebSocket]);

  const stopTask = useCallback(async (taskId?: any) => {
    const resolvedId = (taskId && typeof taskId === 'string') ? taskId : currentTaskId;
    if (!resolvedId) return;
    try {
      await axios.post(`${apiBase}/api/tasks/${resolvedId}/stop`);
      if (resolvedId === currentTaskId) {
        clearPersistence();
        setIsTaskRunning(false);
      }
      fetchHistory();
      addToast("任务已强制停止", "info");
    } catch (err: any) {
      addToast("停止失败: " + (err.response?.data?.detail || err.message), "error");
    }
  }, [currentTaskId, apiBase, clearPersistence, fetchHistory, addToast]);

  const viewHistoryLogs = useCallback(async (taskId: string) => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks/${taskId}/logs`);
      setHistoryLogs(res.data.logs);
      setShowHistoryLogs(true);
    } catch (err) {
      addToast("获取日志失败", "error");
    }
  }, [apiBase, addToast]);

  const deleteHistoryTask = useCallback(async (taskId: string) => {
    if (!await confirm({
      title: '删除任务记录',
      message: '确定要删除这条任务记录吗？此操作不可撤销且会同步删除日志文件。',
      confirmText: '确定删除',
      cancelText: '取消',
      type: 'danger'
    })) return;
    try {
      await axios.delete(`${apiBase}/api/tasks/${taskId}`);
      fetchHistory();
      addToast("任务已删除", "success");
    } catch (err) {
      addToast("删除失败", "error");
    }
  }, [apiBase, fetchHistory, addToast, confirm]);

  const downloadHistoryLogs = useCallback(async (taskId: string) => {
    try {
      const res = await axios.get(`${apiBase}/api/tasks/${taskId}/logs`);
      const blob = new Blob([res.data.logs.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `automation-log-${taskId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast("下载日志失败", "error");
    }
  }, [apiBase, addToast]);

  const downloadLogs = useCallback(() => {
    if (!currentTaskId || fullLogsRef.current.length === 0) return;
    const blob = new Blob([fullLogsRef.current.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-log-${currentTaskId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentTaskId]);

  // Recover active task on mount
  useEffect(() => {
    const recoverTask = async () => {
      const savedTaskId = localStorage.getItem('currentTaskId');
      const savedPreview = localStorage.getItem('previewTasks');
      const savedMobile = localStorage.getItem('selectedMobile');

      if (savedTaskId) {
        try {
          const res = await axios.get(`${apiBase}/api/tasks/${savedTaskId}/status`);
          if (res.data.is_active) {
            setCurrentTaskId(savedTaskId);
            if (savedPreview) setPreviewTasks(JSON.parse(savedPreview));
            if (savedMobile) setSelectedMobile(savedMobile);
            setIsTaskRunning(true);
            setLogs([]);
            fullLogsRef.current = [];
            connectWebSocket(savedTaskId);
          } else {
            clearPersistence();
          }
        } catch (e) {
          clearPersistence();
        }
      }
    };
    recoverTask();
    fetchHistory();
  }, [apiBase, connectWebSocket, clearPersistence, fetchHistory, setSelectedMobile]);

  // Cleanup websocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    previewTasks,
    setPreviewTasks,
    concurrency,
    setConcurrency,
    currentTaskId,
    logs,
    isTaskRunning,
    historyTasks,
    historyLogs,
    showHistoryLogs,
    setShowHistoryLogs,
    handleFileUpload,
    startTask,
    stopTask,
    fetchHistory,
    viewHistoryLogs,
    deleteHistoryTask,
    downloadHistoryLogs,
    downloadLogs
  };
};

