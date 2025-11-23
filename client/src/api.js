import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getLearnings = async () => {
    const response = await axios.get(`${API_URL}/learnings`, { headers: getAuthHeader() });
    return response.data.data;
};

export const addLearning = async (content) => {
    const response = await axios.post(`${API_URL}/learnings`, { content }, { headers: getAuthHeader() });
    return response.data;
};
