import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState('Verifying...');

    useEffect(() => {
        const verify = async () => {
            try {
                await axios.get(`http://localhost:3000/api/verify-email/${token}`);
                setStatus('Email verified successfully! You can now login.');
            } catch (err) {
                setStatus('Verification failed. The link may be invalid or expired.');
            }
        };
        verify();
    }, [token]);

    return (
        <div className="auth-container">
            <h2>Email Verification</h2>
            <p>{status}</p>
            <Link to="/login" className="btn-secondary">Go to Login</Link>
        </div>
    );
}

export default VerifyEmail;
