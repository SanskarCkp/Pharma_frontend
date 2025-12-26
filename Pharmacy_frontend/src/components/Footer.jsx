import React from 'react';

const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white py-4 ml-0 lg:ml-[240px] z-10">
            <div className="container mx-auto text-center">
                <p>&copy; {new Date().getFullYear()} CKP Software Technologies. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;