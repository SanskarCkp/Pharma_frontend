import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./productcatalog.css";
import { authFetch } from "../../../api/http";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const ProductCatalog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const vendor = location.state?.vendor;

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);

  // Redirect if vendor not provided
  useEffect(() => {
    if (!vendor?.id) {
      navigate("/masters/vendors");
    }
  }, [vendor, navigate]);

  // Fetch only this vendor's products
  useEffect(() => {
    if (!vendor?.id) return;

    const fetchVendorProducts = async () => {
      try {
        // Use preferred_vendor filter (your DB field)
        const res = await authFetch(
          `${API_BASE_URL}/api/v1/catalog/products/?preferred_vendor=${vendor.id}`
        );

        const data = await res.json();
        const list = data.results || data;

        // Extra safety: filter again in frontend
        const vendorProducts = list.filter(
          (p) => Number(p.preferred_vendor) === Number(vendor.id)
        );

        setProducts(vendorProducts);
      } catch (err) {
        console.error("Failed to fetch vendor products:", err);
        setProducts([]);
      }
    };

    fetchVendorProducts();
  }, [vendor]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/catalog/categories/`);
        const data = await res.json();
        const list = data.results || data;
        setCategories(list);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  // Filter products for UI
  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) &&
      (categoryFilter ? p.category_name === categoryFilter : true)
  );

  return (
    <div className="catalog-container">
      {/* Header */}
      <div className="catalog-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="catalog-header-text">
          <h1 className="catalog-title">Product Catalog</h1>
          <p className="vendor-subtitle">{vendor?.name || "Unknown Vendor"}</p>
        </div>
      </div>

      {/* Product Card */}
      <div className="catalog-card">
        <div className="catalog-card-header">
          <h2>Available Products</h2>

          {/* Filters */}
          <div className="catalog-filters">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Table */}
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Last Updated</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category_name || "Uncategorized"}</td>
                  <td>
                    {product.updated_at
                      ? new Date(product.updated_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductCatalog;
