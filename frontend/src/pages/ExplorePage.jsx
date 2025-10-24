// ============ src/pages/ExplorePage.jsx ============
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiMapPin } from 'react-icons/fi';
import { fetchProviders } from '../redux/slices/providerSlice';
import { userApi } from '../api/userApi';
import ProviderList from '../components/provider/ProviderList';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import { ProviderCardSkeleton } from '../components/common/Skeleton';
import { NoProvidersFound } from '../components/common/EmptyState';
import { useDebounce } from '../hooks/useDebounce';
import { CUISINES, SPECIALTIES } from '../utils/constants';
import { toast } from 'react-toastify';

const ExplorePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { providers, pagination, loading } = useSelector((state) => state.provider);

  const [filters, setFilters] = useState({
    search: '',
    city: '',
    cuisine: '',
    specialty: '',
    minRating: '',
    page: 1,
  });

  const [showFilters, setShowFilters] = useState(false);
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    dispatch(fetchProviders({ ...filters, search: debouncedSearch }));
  }, [dispatch, debouncedSearch, filters.city, filters.cuisine, filters.specialty, filters.minRating, filters.page]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFavoriteToggle = async (providerId) => {
    try {
      await userApi.toggleFavorite(providerId);
      toast.success('Favorites updated');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      city: '',
      cuisine: '',
      specialty: '',
      minRating: '',
      page: 1,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Explore Tiffin Services</h1>
        <p className="text-lg text-gray-600">
          Find the perfect tiffin service for your daily meals
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name..."
              icon={FiSearch}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter className="mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                placeholder="Enter city"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine
              </label>
              <select
                name="cuisine"
                value={filters.cuisine}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Cuisines</option>
                {CUISINES.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty
              </label>
              <select
                name="specialty"
                value={filters.specialty}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Specialties</option>
                {SPECIALTIES.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Rating
              </label>
              <select
                name="minRating"
                value={filters.minRating}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <div className="mb-4">
          <p className="text-gray-600">
            {pagination?.total || 0} providers found
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : providers.length > 0 ? (
        <>
          <ProviderList
            providers={providers}
            loading={false}
            onFavoriteToggle={handleFavoriteToggle}
          />

          {pagination && pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <NoProvidersFound onAction={clearFilters} />
      )}
    </div>
  );
};

export default ExplorePage;

