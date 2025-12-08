import React from 'react';

const Header = () => {
    return (
        <header className="bg-blue-500 text-white p-4">
            <h1 className="text-2xl">Pharmacy Frontend</h1>
            <nav>
                <ul className="flex space-x-4">
                    <li><a href="/" className="hover:underline">Home</a></li>
                    <li><a href="/pharmacy" className="hover:underline">Pharmacy</a></li>
                    <li> <a href="/suppliers" className="text-blue-600 hover:underline">Suppliers</a></li>
                    <li> <a href="/masters/customers" className="text-blue-600 hover:underline">customers</a></li>
                    <li> <a href="/masters/categories" className="text-blue-600 hover:underline">categories</a></li>
                    <li> <a href="/masters/item" className="text-blue-600 hover:underline">Items</a></li>
                    <li> <a href="/masters/unit" className="text-blue-600 hover:underline">unit</a></li>
                    <li> <a href="/inventory" className="text-blue-600 hover:underline">Inventory</a></li>
                    <li> <a href="/billing" className="text-blue-600 hover:underline">Billing</a></li>

                </ul>
            </nav>
        </header>
    );
};

export default Header;