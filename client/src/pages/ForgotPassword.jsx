import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            await axios.post('http://localhost:3000/api/forgot-password', { email });
            setMessage('If an account exists with that email, a reset link has been sent.');
        } catch (err) {
            setError('Request failed. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <h2>Reset Password</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label>Enter your email address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
                <button type="submit" className="btn-primary">Send Reset Link</button>
            </form>
            <p>
                <Link to="/login">Back to Login</Link>
            </p>
        </div>
    );
}

export default ForgotPassword;
