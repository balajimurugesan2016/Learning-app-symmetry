import React, { useState, useEffect } from 'react';
import { getLearnings, addLearning } from '../api';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const [learnings, setLearnings] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLearnings();
    }, []);

    const fetchLearnings = async () => {
        try {
            const data = await getLearnings();
            setLearnings(data);
        } catch (error) {
            console.error('Failed to fetch learnings', error);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content) return;

        setLoading(true);
        try {
            await addLearning(content);
            setContent('');
            fetchLearnings();
        } catch (error) {
            console.error('Failed to add learning', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <div className="card">
                <p className="subtitle">Record what you learn. We'll remind you to review it.</p>
                <h2>Add New Entry</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>What did you learn today?</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="I learned about React hooks..."
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Saving...' : 'Save Entry'}
                    </button>
                </form>
            </div>

            <div className="history">
                <h2>History</h2>
                {learnings.length === 0 ? (
                    <p className="empty-state">No entries yet. Start learning!</p>
                ) : (
                    <div className="list scrollable-history">
                        {learnings.map((item) => (
                            <div key={item.id} className="list-item">
                                <p className="content">{item.content}</p>
                                <span className="date">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
