import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
        } catch (e) {
            console.error('Logout error', e);
        }
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <header className="header">
            <h1>Learning Tracker</h1>
            {location.pathname === '/' && (
                <button className="btn-secondary" onClick={handleLogout}>Logout</button>
            )}
        </header>
    );
}

export default Header;
