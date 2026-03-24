/**
 * Handles backend logic for API calls, authentication, and data fetching.
 * This file serves as a central point for all API interactions, ensuring
 * that the frontend can easily communicate with the backend services.
 *
 * Functions
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/'; // Adjust as needed

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    

  },
});

// =========================================================
// 1. REQUEST INTERCEPTOR (Attaches the token)
// =========================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      
      config.headers.Authorization = `Bearer ${token}`; 
      
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =========================================================
// 2. RESPONSE INTERCEPTOR (Handles expired/invalid tokens)
// =========================================================
apiClient.interceptors.response.use(
  (response) => {

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('Token invalid or expired. Logging out...');
      
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'; 
      }
    }
    
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login/', { email, password });
    return response.data; // Return user data and token
  } catch (error) {
    throw new Error('Login failed. Please check your credentials', { cause: error.message });
  }
};

export const getLeaveHistory = async () => {
  try {
    const response = await apiClient.get('/leaves/history/');
    return response.data; // Return leave history data
  } catch (error) {
    throw new Error('Failed to fetch leave history', { cause: error.message });
  }
};

export const applyLeave = async (leaveData) => {
  try {
    const response = await apiClient.post('/leaves/apply/', leaveData);
    return response.data; // Return newly created leave request
  } catch (error) {
    throw new Error('Failed to apply for leave', { cause: error.message });
  }
};

export const getAllLeaves = async () => {
  try {
    const response = await apiClient.get('/leaves/all');
    return response.data; // Return all leave data
  } catch (error) {
    throw new Error('Failed to fetch all leaves', { cause: error.message });
  }
};

// API actions for admin
export const updateLeaveData = async (leaveId, leaveData) => {
  try {
    const response = await apiClient.patch(`/leaves/${leaveId}/`, leaveData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to update leave data', { cause: error.message });
  }
};

export const createEmployee = async (employeeData) => {
  try {
    const response = await apiClient.post('/auth/register/', employeeData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to create employee', { cause: error.message });
  }
};

export const getPendingLeaves = async () => {
  try {
    const response = await apiClient.get('/leaves/pending/');
    return response.data; 
  } catch (error) {
    throw new Error('Failed to fetch pending leaves', { cause: error.message });
  }
}

export const getStatistics = async () => {
  try {
    const response = await apiClient.get('/leaves/statistics/');
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch statistics', { cause: error.message });
  }
};