import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * AdminImages Component
 * 
 * Admin interface for managing AI descriptions of images found in the knowledgebase.
 * Allows admins to add descriptive captions to images for better AI chat context.
 */
const AdminImages = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [images, setImages] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [savedDescriptions, setSavedDescriptions] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error checking profile:', profileError);
          setLoading(false);
          return;
        }

        if (profile?.role === 'admin') {
          setIsAdmin(true);
          await loadImagesAndCaptions();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in checkAuth:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Load images from knowledgebase and existing captions from Supabase
  const loadImagesAndCaptions = async () => {
    try {
      // 1. Fetch knowledgebase.json
      const response = await fetch('/knowledgebase.json');
      if (!response.ok) {
        throw new Error('Failed to load knowledgebase');
      }
      const data = await response.json();

      // 2. Extract all image URLs from content fields
      const imageUrls = new Set();
      const categories = data.categories || data;
      
      if (Array.isArray(categories)) {
        categories.forEach(item => {
          const content = item.content || '';
          
          // Extract from <img> tags
          const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
          let match;
          while ((match = imgRegex.exec(content)) !== null) {
            imageUrls.add(match[1]);
          }
          
          // Extract from markdown style ![alt](url)
          const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
          while ((match = mdRegex.exec(content)) !== null) {
            imageUrls.add(match[2]);
          }
        });
      }

      // Convert Set to Array
      const uniqueImages = Array.from(imageUrls).filter(url => url && url.trim());
      setImages(uniqueImages);

      // 3. Fetch existing captions from Supabase
      const { data: captions, error } = await supabase
        .from('image_captions')
        .select('url, description');

      if (error) {
        console.error('Error fetching captions:', error);
      } else if (captions) {
        const captionsMap = {};
        captions.forEach(caption => {
          captionsMap[caption.url] = caption.description;
        });
        setDescriptions(captionsMap);
        setSavedDescriptions(captionsMap);
      }
    } catch (error) {
      console.error('Error loading images and captions:', error);
      showToast('Error loading data', 'error');
    }
  };

  // Handle description input change
  const handleDescriptionChange = (url, value) => {
    setDescriptions(prev => ({
      ...prev,
      [url]: value
    }));
  };

  // Save description to Supabase
  const handleSave = async (url) => {
    const description = descriptions[url];
    
    if (!description || !description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }

    setSavingStates(prev => ({ ...prev, [url]: true }));

    try {
      // Upsert the caption
      const { error } = await supabase
        .from('image_captions')
        .upsert(
          { url, description: description.trim() },
          { onConflict: 'url' }
        );

      if (error) {
        console.error('Error saving caption:', error);
        showToast('Failed to save', 'error');
      } else {
        setSavedDescriptions(prev => ({
          ...prev,
          [url]: description.trim()
        }));
        showToast('Saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      showToast('Failed to save', 'error');
    } finally {
      setSavingStates(prev => ({ ...prev, [url]: false }));
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check if description has been modified
  const isModified = (url) => {
    return descriptions[url] !== savedDescriptions[url];
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <ImageIcon size={24} />
            </span>
            Image Descriptions Manager
          </h1>
          <Link 
            to="/" 
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-2 transition"
          >
            <ArrowLeft size={16} /> Back to Site
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">About Image Descriptions</h3>
              <p className="text-sm text-blue-800">
                Add descriptive captions to images to help the AI chat understand and reference visual content.
                These descriptions will be used when the AI needs to explain or reference images in responses.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Images Found</p>
              <p className="text-2xl font-bold text-slate-800">{images.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Descriptions Added</p>
              <p className="text-2xl font-bold text-green-600">
                {Object.keys(savedDescriptions).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Remaining</p>
              <p className="text-2xl font-bold text-orange-600">
                {images.length - Object.keys(savedDescriptions).length}
              </p>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        {images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <ImageIcon size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Images Found</h3>
            <p className="text-slate-500">
              No images were found in the knowledgebase content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((url, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
              >
                {/* Image Preview */}
                <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="text-slate-400 text-sm p-4 text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>Failed to load image</div>';
                    }}
                  />
                </div>

                {/* Image URL */}
                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs text-slate-500 truncate" title={url}>
                    {url}
                  </p>
                </div>

                {/* Description Input */}
                <div className="p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    AI Description
                  </label>
                  <textarea
                    value={descriptions[url] || ''}
                    onChange={(e) => handleDescriptionChange(url, e.target.value)}
                    placeholder="e.g., Screenshot of the FBO tariff table showing pricing tiers..."
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                    rows="4"
                  />
                  
                  {/* Save Button */}
                  <button
                    onClick={() => handleSave(url)}
                    disabled={savingStates[url] || !isModified(url)}
                    className={`mt-3 w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                      savingStates[url]
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : isModified(url)
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-green-100 text-green-700 cursor-default'
                    }`}
                  >
                    {savingStates[url] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : isModified(url) ? (
                      <>
                        <Save size={16} />
                        Save
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Saved
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              toastMessage.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminImages;

