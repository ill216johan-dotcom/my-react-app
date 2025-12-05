import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient.js';
import { ORDER_STATUSES, USER_ROLES } from '../db_schema.js';
import * as XLSX from 'xlsx';
import OrderChat from '../components/OrderChat.jsx';
import CalculatorLayout from '../components/CalculatorLayout.jsx';

/**
 * Helper Functions - Shared across all dashboard components
 */

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Не установлено';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format date with time for manager dashboard
const formatDateWithTime = (dateString) => {
  if (!dateString) return 'Не установлено';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status badge color (Enterprise Design System)
const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'searching':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'booked':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case ORDER_STATUSES.OPEN:
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case ORDER_STATUSES.IN_PROGRESS:
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case ORDER_STATUSES.COMPLETED:
    case 'completed':
      return 'bg-slate-100 text-slate-800 border border-slate-200';
    case ORDER_STATUSES.CANCELLED:
    case 'cancelled':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200';
  }
};

// Get status display text in Russian
const getStatusDisplayText = (status) => {
  switch (status) {
    case 'searching':
      return 'Поиск исполнителя';
    case 'booked':
      return 'В работе';
    case ORDER_STATUSES.OPEN:
    case 'open':
      return 'Открыт';
    case ORDER_STATUSES.IN_PROGRESS:
    case 'in_progress':
      return 'В процессе';
    case ORDER_STATUSES.COMPLETED:
    case 'completed':
      return 'Выполнен';
    case ORDER_STATUSES.CANCELLED:
    case 'cancelled':
      return 'Отменен';
    default:
      return status;
  }
};

/**
 * Exchange Page - Multi-Role Support
 * 
 * This page handles different user roles:
 * - Clients: Create orders and view their orders
 * - Packers: Browse marketplace and place bids
 */
function Exchange() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user and their profile
    const fetchUserData = async () => {
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          return;
        }

        setUser(user);

        // Fetch user profile from profiles table
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <CalculatorLayout title="Packaging Exchange">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Загрузка вашего профиля...</p>
          </div>
        </div>
      </CalculatorLayout>
    );
  }

  return (
    <CalculatorLayout title="Packaging Exchange">
      {/* Description */}
      <div className="mb-6">
        <p className="text-slate-600 dark:text-slate-400">
          {profile?.role === USER_ROLES.CLIENT && 'Создавайте заказы и управляйте вашими запросами на упаковку'}
          {profile?.role === USER_ROLES.PACKER && 'Просматривайте доступные заказы и управляйте вашей работой'}
          {(profile?.role === USER_ROLES.MANAGER || profile?.role === USER_ROLES.ADMIN) && 'Управляйте всеми заказами и разрешайте споры'}
          {!profile?.role && 'Добро пожаловать на биржу'}
        </p>
      </div>

      {/* Role Badge Section */}
      <div className="mb-6 flex items-center space-x-3">
        <div className="inline-flex items-center px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md text-sm font-medium border border-indigo-200 dark:border-indigo-800">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          {profile?.role || 'Роль не назначена'}
        </div>
      </div>

      {/* Role-Based View */}
      {profile?.role === USER_ROLES.CLIENT && <ClientDashboard user={user} />}
      {profile?.role === USER_ROLES.PACKER && <PackerDashboard user={user} />}
      {(profile?.role === USER_ROLES.MANAGER || profile?.role === USER_ROLES.ADMIN) && <ManagerDashboard user={user} profile={profile} />}
      
      {!profile?.role && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <p className="text-slate-600 dark:text-slate-400">Ваша роль еще не назначена. Пожалуйста, свяжитесь с администратором.</p>
        </div>
      )}
    </CalculatorLayout>
  );
}

/**
 * Client Dashboard Component
 * Allows clients to create orders and view their orders
 */
function ClientDashboard({ user }) {
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderBids, setOrderBids] = useState({}); // Store bids by order_id
  const [expandedOrder, setExpandedOrder] = useState(null); // Track which order's bids are shown
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState(false);
  const [expandedOrderDetails, setExpandedOrderDetails] = useState(null); // Track which order details are shown
  const [acceptedPackers, setAcceptedPackers] = useState({}); // Store accepted packer info by order_id
  const [chatOrder, setChatOrder] = useState(null); // Track which order's chat is open
  const [chatPackerId, setChatPackerId] = useState(null); // Track which packer to chat with
  const [profile, setProfile] = useState(null); // User profile for chat
  
  // NEW: Focus view state
  const [focusedOrder, setFocusedOrder] = useState(null); // Current order in focus view
  const [showItemsModal, setShowItemsModal] = useState(false); // Items table modal
  const [showCreateForm, setShowCreateForm] = useState(false); // Create order form modal
  
  // Excel import state
  const [importedItems, setImportedItems] = useState([]);
  const [showImportedData, setShowImportedData] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [totalQuantity, setTotalQuantity] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: ''
  });

  useEffect(() => {
    if (user) {
      fetchMyOrders();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchMyOrders = async () => {
    if (!user) return;
    
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        alert('Не удалось загрузить заказы. Попробуйте еще раз.');
      } else {
        setMyOrders(data || []);
        // Fetch bid counts for all orders
        if (data && data.length > 0) {
          fetchBidCounts(data.map(o => o.id));
          // Fetch accepted packer info for booked orders
          fetchAcceptedPackers(data.filter(o => o.status === 'booked'));
        }
      }
    } catch (error) {
      console.error('Error in fetchMyOrders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAcceptedPackers = async (bookedOrders) => {
    if (!bookedOrders || bookedOrders.length === 0) return;
    
    try {
      const orderIds = bookedOrders.map(o => o.id);
      const { data, error } = await supabase
        .from('bids')
        .select(`
          order_id,
          profiles:packer_id (
            full_name
          )
        `)
        .in('order_id', orderIds)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching accepted packers:', error);
      } else {
        const packersMap = {};
        data.forEach(bid => {
          packersMap[bid.order_id] = bid.profiles?.full_name || 'Packer';
        });
        setAcceptedPackers(packersMap);
      }
    } catch (error) {
      console.error('Error in fetchAcceptedPackers:', error);
    }
  };

  const fetchBidCounts = async (orderIds) => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('order_id')
        .in('order_id', orderIds);

      if (error) {
        console.error('Error fetching bid counts:', error);
      } else {
        // Count bids per order
        const counts = {};
        data.forEach(bid => {
          counts[bid.order_id] = (counts[bid.order_id] || 0) + 1;
        });
        setOrderBids(prev => {
          const updated = { ...prev };
          orderIds.forEach(id => {
            if (!updated[id]) {
              updated[id] = { count: counts[id] || 0, bids: [] };
            } else {
              updated[id].count = counts[id] || 0;
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error in fetchBidCounts:', error);
    }
  };

  const fetchBidsForOrder = async (orderId) => {
    setLoadingBids(true);
    try {
      // Fetch bids with packer profile info
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          profiles:packer_id (
            full_name
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bids:', error);
        alert('Не удалось загрузить предложения. Попробуйте еще раз.');
      } else {
        setOrderBids(prev => ({
          ...prev,
          [orderId]: {
            count: data.length,
            bids: data || []
          }
        }));
      }
    } catch (error) {
      console.error('Error in fetchBidsForOrder:', error);
    } finally {
      setLoadingBids(false);
    }
  };

  const toggleBidsView = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      // Fetch bids if not already loaded
      if (!orderBids[orderId]?.bids || orderBids[orderId].bids.length === 0) {
        fetchBidsForOrder(orderId);
      }
    }
  };

  const handleAcceptBid = async (bid, orderId) => {
    if (!confirm(`Принять предложение от ${bid.profiles?.full_name || 'этого упаковщика'} за $${parseFloat(bid.price).toFixed(2)}?`)) {
      return;
    }

    setAcceptingBid(true);
    try {
      // Update order status to 'booked' and store accepted packer
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'booked',
          accepted_packer_id: bid.packer_id
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order:', orderError);
        alert('Не удалось обновить заказ. Попробуйте еще раз.');
        return;
      }

      // Update accepted bid status to 'accepted'
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bid.id);

      if (bidError) {
        console.error('Error updating bid:', bidError);
        alert('Не удалось принять предложение. Попробуйте еще раз.');
        return;
      }

      // Optionally reject other bids for this order
      const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('order_id', orderId)
        .neq('id', bid.id);

      if (rejectError) {
        console.error('Error rejecting other bids:', rejectError);
        // Don't show error to user - this is optional
      }

      // Success!
      alert('Предложение принято! Заказ забронирован. 🎉');
      
      // Close chat if open
      setChatOrder(null);
      setChatPackerId(null);
      
      // Refresh data
      fetchMyOrders();
      fetchBidsForOrder(orderId);
    } catch (error) {
      console.error('Error in handleAcceptBid:', error);
      alert('An unexpected error occurred.');
    } finally {
      setAcceptingBid(false);
    }
  };

  const openChat = (order, packerId) => {
    setChatOrder(order);
    setChatPackerId(packerId);
  };

  const closeChat = () => {
    setChatOrder(null);
    setChatPackerId(null);
  };

  const handleHirePackerFromChat = async (packerId) => {
    if (!chatOrder) return;

    // Find the bid for this packer
    const bid = orderBids[chatOrder.id]?.bids?.find(b => b.packer_id === packerId);
    if (bid) {
      await handleAcceptBid(bid, chatOrder.id);
    } else {
      alert('Не удалось найти информацию о предложении.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // Read as ArrayBuffer (critical for .xls support)
        const data = new Uint8Array(event.target.result);
        
        // Parse workbook
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // CRITICAL FIX: Use column letters (A, B, C, etc.) to prevent shifting
        // This creates objects like { A: "value", B: "value", N: "100" }
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: "A",   // Use column letters as keys
          defval: ""     // Keep empty cells as empty strings
        });
        
        // Skip first 2 rows (headers) - array starts at index 0
        const dataRows = jsonData.slice(2);
        
        const parsedItems = [];
        let totalQty = 0;
        
        dataRows.forEach((row, index) => {
          // Map ALL columns A-N by Column Letter (exact match to user's template):
          // A: Артикул (SKU)
          // B: Наименование (Name)
          // C: Штрихкод (Barcode)
          // D: Особые отметки (Special Notes)
          // E: Польз. поле 1 (Custom 1)
          // F: Польз. поле 2 (Custom 2)
          // G: Польз. поле 3 (Custom 3)
          // H: КИЗ (KIZ)
          // I: Доп. предподготовка (Prep Work) - Crucial!
          // J: Транспортная упаковка (Transport Pack) - Crucial!
          // K: Фотография (Photo URL)
          // L: Вспомогательная информация (Comment)
          // M: Исходный ШК (Source Barcode)
          // N: Кол-во (Quantity)
          
          const sku = row.A || "";
          const name = row.B || "";
          const barcode = row.C || "";
          const special_notes = row.D || "";
          const custom_1 = row.E || "";
          const custom_2 = row.F || "";
          const custom_3 = row.G || "";
          const kiz = row.H || "";
          const prep_work = row.I || "";
          const transport_pack = row.J || "";
          const photo_url = row.K || "";
          const comment = row.L || "";
          const source_barcode = row.M || "";
          const quantityRaw = row.N || "";
          
          // Skip rows where SKU is empty or falsy
          if (!sku || (typeof sku === 'string' && sku.trim() === '')) {
            return;
          }
          
          // Parse quantity as integer, default to 0 if invalid
          let quantity = 0;
          if (quantityRaw !== undefined && quantityRaw !== null && quantityRaw !== '') {
            const parsed = parseInt(quantityRaw, 10);
            quantity = isNaN(parsed) ? 0 : parsed;
          }
          
          totalQty += quantity;
          
          parsedItems.push({
            id: `item-${Date.now()}-${index}-${Math.random()}`, // Unique ID
            sku: sku.toString().trim(),
            name: name ? name.toString().trim() : '',
            barcode: barcode ? barcode.toString().trim() : '',
            special_notes: special_notes ? special_notes.toString().trim() : '',
            custom_1: custom_1 ? custom_1.toString().trim() : '',
            custom_2: custom_2 ? custom_2.toString().trim() : '',
            custom_3: custom_3 ? custom_3.toString().trim() : '',
            kiz: kiz ? kiz.toString().trim() : '',
            prep_work: prep_work ? prep_work.toString().trim() : '',
            transport_pack: transport_pack ? transport_pack.toString().trim() : '',
            photo_url: photo_url ? photo_url.toString().trim() : '',
            comment: comment ? comment.toString().trim() : '',
            source_barcode: source_barcode ? source_barcode.toString().trim() : '',
            quantity: quantity
          });
        });
        
        // Update state
        setImportedItems(parsedItems);
        setTotalQuantity(totalQty);
        setShowImportedData(true);
        
        // Update description field with summary
        const summary = `Imported ${parsedItems.length} items (Total quantity: ${totalQty})`;
        setFormData(prev => ({
          ...prev,
          description: summary + (prev.description ? '\n\n' + prev.description : '')
        }));
        
        alert(`Успешно импортировано ${parsedItems.length} товаров!`);
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Не удалось обработать Excel файл. Проверьте формат файла и попробуйте еще раз.');
      }
    };
    
    reader.onerror = () => {
      alert('Не удалось прочитать файл. Попробуйте еще раз.');
    };
    
    // Read file as ArrayBuffer
    reader.readAsArrayBuffer(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleDeleteItem = (itemId) => {
    setImportedItems(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      // Recalculate total quantity
      const newTotal = updated.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTotalQuantity(newTotal);
      return updated;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemEdit = (itemId, field, value) => {
    setImportedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const newItem = { ...item, [field]: value };
          // If quantity changed, recalculate total
          if (field === 'quantity') {
            newItem.quantity = parseInt(value, 10) || 0;
          }
          return newItem;
        }
        return item;
      });
      
      // Recalculate total quantity
      const newTotal = updated.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setTotalQuantity(newTotal);
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Вы должны войти в систему, чтобы создать заказ.');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      alert('Пожалуйста, введите название заказа.');
      return;
    }

    // Deadline is now optional - removed validation

    setSubmitting(true);
    try {
      const orderData = {
        client_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deadline: formData.deadline || null, // Optional - send null if empty
        items: importedItems.length > 0 ? importedItems : null // Save items as JSONb
        // status field omitted - database will use default value 'searching'
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) {
        console.error('Error creating order:', error);
        alert('Не удалось создать заказ. Попробуйте еще раз.');
      } else {
        // Success!
        alert('Заказ успешно создан! 🎉');
        
        // Clear form and imported data
        setFormData({
          title: '',
          description: '',
          budget: '',
          deadline: ''
        });
        setImportedItems([]);
        setTotalQuantity(0);
        setShowImportedData(false);

        // Refresh orders list
        fetchMyOrders();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open order in focus view
  const openOrderFocus = (order) => {
    setFocusedOrder(order);
    // Load bids if status is searching
    if (order.status === 'searching') {
      fetchBidsForOrder(order.id);
    }
  };

  // Close focus view, return to dashboard
  const closeFocusView = () => {
    setFocusedOrder(null);
    setShowItemsModal(false);
    setChatOrder(null);
    setChatPackerId(null);
  };

  // If an order is focused, show Order Focus View
  if (focusedOrder) {
    return (
      <OrderFocusView
        order={focusedOrder}
        user={user}
        profile={profile}
        orderBids={orderBids}
        loadingBids={loadingBids}
        acceptingBid={acceptingBid}
        acceptedPackers={acceptedPackers}
        chatOrder={chatOrder}
        chatPackerId={chatPackerId}
        showItemsModal={showItemsModal}
        onBack={closeFocusView}
        onOpenItems={() => setShowItemsModal(true)}
        onCloseItems={() => setShowItemsModal(false)}
        onOpenChat={(packerId) => {
          setChatOrder(focusedOrder);
          setChatPackerId(packerId);
        }}
        onCloseChat={() => {
          setChatOrder(null);
          setChatPackerId(null);
        }}
        onAcceptBid={handleAcceptBid}
        onHirePacker={handleHirePackerFromChat}
      />
    );
  }

  // Dashboard View
  return (
    <>
      {/* Dashboard: Grid of Order Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Мои заказы</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать заказ
          </button>
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : myOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Заказов пока нет</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">Создайте ваш первый заказ, чтобы начать!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Создать заказ
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                bidCount={orderBids[order.id]?.count || 0}
                acceptedPacker={acceptedPackers[order.id]}
                onClick={() => openOrderFocus(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Order Form Modal */}
      {showCreateForm && (
        <CreateOrderModal
          user={user}
          importedItems={importedItems}
          totalQuantity={totalQuantity}
          showTable={showTable}
          showImportedData={showImportedData}
          formData={formData}
          submitting={submitting}
          onClose={() => setShowCreateForm(false)}
          onFileUpload={handleFileUpload}
          onToggleTable={() => setShowTable(!showTable)}
          onItemEdit={handleItemEdit}
          onDeleteItem={handleDeleteItem}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      )}

      {/* Excel Import Section for Create Form - Keep this structure */}
      <div className="hidden">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Excel Template</h3>
        <p className="text-slate-500 text-sm mb-4">
          Import your order items from an Excel file (.xls, .xlsx, .csv). 
          The file should have a 2-row header with data starting from row 3.
        </p>
        
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Template
            </span>
          </label>
          
          {importedItems.length > 0 && (
            <div className="flex items-center gap-2 text-emerald-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{importedItems.length} items imported (Total: {totalQuantity} units)</span>
            </div>
          )}
        </div>

        {/* Imported Data Table */}
        {showImportedData && importedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">Imported Items ({importedItems.length})</h4>
              <button
                onClick={() => setShowTable(!showTable)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition"
              >
                {showTable ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Hide Table
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Show Table
                  </>
                )}
              </button>
            </div>
            
            {showTable && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">SKU (A)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Name (B)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Barcode (C)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Special (D)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Custom 1 (E)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Custom 2 (F)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Custom 3 (G)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">KIZ (H)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Prep Work (I)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Transport (J)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Photo (K)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Comment (L)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Source BC (M)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Qty (N)</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Del</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {importedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleItemEdit(item.id, 'sku', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemEdit(item.id, 'name', e.target.value)}
                            className="w-32 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.barcode}
                            onChange={(e) => handleItemEdit(item.id, 'barcode', e.target.value)}
                            className="w-28 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.special_notes || ''}
                            onChange={(e) => handleItemEdit(item.id, 'special_notes', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.custom_1 || ''}
                            onChange={(e) => handleItemEdit(item.id, 'custom_1', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.custom_2 || ''}
                            onChange={(e) => handleItemEdit(item.id, 'custom_2', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.custom_3 || ''}
                            onChange={(e) => handleItemEdit(item.id, 'custom_3', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.kiz || ''}
                            onChange={(e) => handleItemEdit(item.id, 'kiz', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.prep_work || ''}
                            onChange={(e) => handleItemEdit(item.id, 'prep_work', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-yellow-50"
                            title="Доп. предподготовка - Crucial!"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.transport_pack || ''}
                            onChange={(e) => handleItemEdit(item.id, 'transport_pack', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-yellow-50"
                            title="Транспортная упаковка - Crucial!"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.photo_url || ''}
                            onChange={(e) => handleItemEdit(item.id, 'photo_url', e.target.value)}
                            className="w-24 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.comment || ''}
                            onChange={(e) => handleItemEdit(item.id, 'comment', e.target.value)}
                            className="w-32 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={item.source_barcode || ''}
                            onChange={(e) => handleItemEdit(item.id, 'source_barcode', e.target.value)}
                            className="w-28 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemEdit(item.id, 'quantity', e.target.value)}
                            className="w-16 px-1 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-right font-semibold"
                            min="0"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="inline-flex items-center justify-center p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                            title="Delete this item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan="14" className="px-2 py-2 text-xs font-semibold text-slate-900 text-right">Total Quantity:</td>
                      <td className="px-2 py-2 text-xs font-bold text-indigo-600 text-center">{totalQuantity}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Order Form */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Create New Order</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Pack 100 T-shirts"
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide full details about your order..."
              rows={5}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none text-slate-900"
            />
          </div>

          {/* Budget and Deadline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-slate-700 mb-2">
                Budget (optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-2">
                Desired Date (Optional)
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition shadow-sm ${
                submitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>

      {/* My Orders List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">My Orders</h3>
        
        {loadingOrders ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-slate-600">Loading orders...</p>
          </div>
        ) : myOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-lg text-slate-600">No active orders</p>
            <p className="text-sm text-slate-500">Create your first order using the form above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <div
                key={order.id}
                className="border border-slate-200 rounded-lg p-5 hover:shadow-sm transition bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-base font-semibold text-slate-900">{order.title}</h4>
                  <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                {order.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{order.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-slate-500 text-xs">Budget:</span>
                    <p className="font-medium text-slate-900">
                      {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Deadline:</span>
                    <p className="font-medium text-slate-900">{formatDate(order.deadline)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Created:</span>
                    <p className="font-medium text-slate-900">{formatDate(order.created_at)}</p>
                  </div>
                </div>

                {/* View Bids Button */}
                {order.status !== 'booked' && order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => toggleBidsView(order.id)}
                    className="w-full mt-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-md hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    {expandedOrder === order.id ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Скрыть отклики
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Смотреть отклики ({orderBids[order.id]?.count || 0})
                      </>
                    )}
                  </button>
                )}

                {/* Expanded Bids View */}
                {expandedOrder === order.id && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h5 className="font-semibold text-slate-900 text-sm mb-3">Предложения от упаковщиков</h5>
                    
                    {loadingBids ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-slate-600">Загрузка откликов...</p>
                      </div>
                    ) : !orderBids[order.id]?.bids || orderBids[order.id].bids.length === 0 ? (
                      <p className="text-center text-slate-500 text-sm py-4">Откликов пока нет. Ожидаем ответа упаковщиков...</p>
                    ) : (
                      <div className="space-y-3">
                        {orderBids[order.id].bids.map((bid) => (
                          <div
                            key={bid.id}
                            className={`p-4 rounded-lg border ${
                              bid.status === 'accepted' 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : bid.status === 'rejected'
                                ? 'bg-slate-50 border-slate-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0">
                                  {(bid.profiles?.full_name || 'P')[0].toUpperCase()}
                                </div>
                                
                                {/* Bid Details */}
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{bid.profiles?.full_name || 'Упаковщик'}</p>
                                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-slate-500 text-xs">Цена:</span>
                                      <p className="font-semibold text-slate-900">${parseFloat(bid.price).toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 text-xs">Дней:</span>
                                      <p className="font-semibold text-slate-900">{bid.days_to_complete} дн.</p>
                                    </div>
                                  </div>
                                  {bid.comment && (
                                    <p className="mt-2 text-sm text-slate-600 italic">"{bid.comment}"</p>
                                  )}
                                  {bid.status && bid.status !== 'pending' && (
                                    <span className={`inline-block mt-2 px-2 py-1 rounded-md text-xs font-medium border ${
                                      bid.status === 'accepted' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      {bid.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Chat and Accept Buttons */}
                              <div className="ml-4 flex gap-2">
                                {/* Chat Button */}
                                <button
                                  onClick={() => openChat(order, bid.packer_id)}
                                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  Чат
                                </button>

                                {/* Accept Button */}
                                {bid.status === 'pending' && order.status !== 'booked' && (
                                  <button
                                    onClick={() => handleAcceptBid(bid, order.id)}
                                    disabled={acceptingBid}
                                    className={`px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition ${
                                      acceptingBid ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    Принять
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Booked Status Indicator */}
                {order.status === 'booked' && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-800 mb-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-sm">Order Booked & In Progress</span>
                        </div>
                        {acceptedPackers[order.id] && (
                          <p className="text-sm text-emerald-700 ml-7">
                            Назначен: <span className="font-semibold">{acceptedPackers[order.id]}</span>
                          </p>
                        )}
                      </div>
                      {order.accepted_packer_id && (
                        <button
                          onClick={() => openChat(order, order.accepted_packer_id)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Открыть чат
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Details Button (for orders with items) */}
                {order.items && order.items.length > 0 && (
                  <button
                    onClick={() => setExpandedOrderDetails(expandedOrderDetails === order.id ? null : order.id)}
                    className="w-full mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {expandedOrderDetails === order.id ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Order Details
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        View Order Details ({order.items.length} items)
                      </>
                    )}
                  </button>
                )}

                {/* Expanded Order Details */}
                {expandedOrderDetails === order.id && order.items && order.items.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h5 className="font-semibold text-gray-800 mb-3">Order Items ({order.items.length})</h5>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SKU</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Barcode</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Special</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Custom 1</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Custom 2</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Custom 3</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">KIZ</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Prep Work</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Transport</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Photo</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Comment</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Source BC</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-2 py-2 text-xs font-medium text-gray-900">{item.sku}</td>
                              <td className="px-2 py-2 text-xs text-gray-700">{item.name}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.barcode || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.special_notes || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.custom_1 || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.custom_2 || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.custom_3 || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.kiz || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600 bg-yellow-50">{item.prep_work || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600 bg-yellow-50">{item.transport_pack || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.photo_url || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.comment || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.source_barcode || '-'}</td>
                              <td className="px-2 py-2 text-xs text-gray-900 text-right font-semibold">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="13" className="px-2 py-2 text-xs font-semibold text-gray-900 text-right">Total Quantity:</td>
                            <td className="px-2 py-2 text-xs font-bold text-indigo-600 text-right">
                              {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {chatOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={closeChat}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Chat Component */}
            <OrderChat
              order={chatOrder}
              currentUser={user}
              currentUserProfile={profile}
              selectedPackerId={chatPackerId}
              onHirePacker={handleHirePackerFromChat}
            />
          </div>
        </div>
      )}
      </div>
    </>
  );
}

/**
 * Packer Dashboard Component
 * Allows packers to browse marketplace and place bids
 */
function PackerDashboard({ user }) {
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [myBids, setMyBids] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [chatOrder, setChatOrder] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('marketplace'); // 'marketplace' or 'active'
  
  // Bid form state
  const [bidData, setBidData] = useState({
    price: '',
    days_to_complete: '',
    comment: ''
  });

  useEffect(() => {
    if (user) {
      fetchMarketplaceOrders();
      fetchMyBids();
      fetchMyActiveOrders();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchMyActiveOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id (full_name)
        `)
        .eq('accepted_packer_id', user.id)
        .in('status', ['booked', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active orders:', error);
      } else {
        setMyActiveOrders(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMyActiveOrders:', error);
    }
  };

  const fetchMarketplaceOrders = async () => {
    if (!user) return;
    
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'searching')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace orders:', error);
        alert('Не удалось загрузить заказы с биржи. Попробуйте еще раз.');
      } else {
        setMarketplaceOrders(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMarketplaceOrders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMyBids = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('bids')
        .select('order_id')
        .eq('packer_id', user.id);

      if (error) {
        console.error('Error fetching my bids:', error);
      } else {
        // Store order IDs that the user has already bid on
        setMyBids((data || []).map(bid => bid.order_id));
      }
    } catch (error) {
      console.error('Error in fetchMyBids:', error);
    }
  };

  const handleBidClick = (order) => {
    setSelectedOrder(order);
    setBidData({
      price: '',
      days_to_complete: '',
      comment: ''
    });
    setShowBidModal(true);
  };

  const handleBidInputChange = (e) => {
    const { name, value } = e.target;
    setBidData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    
    if (!user || !selectedOrder) return;

    // Validation
    if (!bidData.price || parseFloat(bidData.price) <= 0) {
      alert('Пожалуйста, введите корректную цену.');
      return;
    }

    if (!bidData.days_to_complete || parseInt(bidData.days_to_complete) <= 0) {
      alert('Пожалуйста, введите корректное количество дней.');
      return;
    }

    setSubmittingBid(true);
    try {
      const bidPayload = {
        order_id: selectedOrder.id,
        packer_id: user.id,
        price: parseFloat(bidData.price),
        days_to_complete: parseInt(bidData.days_to_complete),
        comment: bidData.comment.trim() || null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('bids')
        .insert([bidPayload])
        .select();

      if (error) {
        console.error('Error submitting bid:', error);
        alert('Не удалось отправить отклик. Попробуйте еще раз.');
      } else {
        // Success!
        alert('Отклик успешно отправлен! 🎉');
        
        // Close modal
        setShowBidModal(false);
        setSelectedOrder(null);
        
        // Refresh bids list to hide the button
        fetchMyBids();
      }
    } catch (error) {
      console.error('Error in handleSubmitBid:', error);
      alert('An unexpected error occurred.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const hasAlreadyBid = (orderId) => {
    return myBids.includes(orderId);
  };

  const openChat = (order) => {
    setChatOrder(order);
  };

  const closeChat = () => {
    setChatOrder(null);
  };

  return (
    <>
      {/* View Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setView('marketplace')}
            className={`px-6 py-2 rounded-md font-medium transition text-sm ${
              view === 'marketplace'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Биржа заказов
          </button>
          <button
            onClick={() => setView('active')}
            className={`px-6 py-2 rounded-md font-medium transition text-sm ${
              view === 'active'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Мои активные заказы ({myActiveOrders.length})
          </button>
        </div>
      </div>

      {/* Marketplace Feed */}
      {view === 'marketplace' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Биржа - Доступные заказы</h3>
        
        {loadingOrders ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-slate-600">Loading orders...</p>
          </div>
        ) : marketplaceOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-4 text-lg text-slate-600">Нет доступных заказов</p>
            <p className="text-sm text-slate-500">Зайдите позже, чтобы увидеть новые заказы!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {marketplaceOrders.map((order) => (
              <div
                key={order.id}
                className="border border-slate-200 rounded-lg p-5 hover:shadow-sm transition bg-white"
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-base font-semibold text-slate-900">{order.title}</h4>
                  <span className="px-3 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    {getStatusDisplayText('searching')}
                  </span>
                </div>
                
                {order.description && (
                  <p className="text-slate-600 text-sm mb-4">{order.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-slate-500 text-xs">Бюджет:</span>
                    <p className="font-medium text-slate-900">
                      {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Не указан'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Дедлайн:</span>
                    <p className="font-medium text-slate-900">{formatDate(order.deadline)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Размещен:</span>
                    <p className="font-medium text-slate-900">{formatDate(order.created_at)}</p>
                  </div>
                </div>

                {/* Action Button */}
                {hasAlreadyBid(order.id) ? (
                  <div className="flex items-center justify-center py-2 text-emerald-600 font-medium text-sm">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Отклик отправлен
                  </div>
                ) : (
                  <button
                    onClick={() => handleBidClick(order)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition text-sm"
                  >
                    Откликнуться
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* My Active Orders View */}
      {view === 'active' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Мои активные заказы</h3>
          
          {myActiveOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-lg text-slate-600">Нет активных заказов</p>
              <p className="text-sm text-slate-500">Принятые заказы будут отображаться здесь</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myActiveOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-slate-200 rounded-lg p-5 hover:shadow-sm transition bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-semibold text-slate-900">{order.title}</h4>
                        <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                          {getStatusDisplayText(order.status)}
                        </span>
                        {order.is_disputed && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600 text-white">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            СПОР
                          </span>
                        )}
                      </div>

                      {order.description && (
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">{order.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs">Клиент:</span>
                          <p className="font-medium text-slate-900">{order.client?.full_name || 'Неизвестен'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Budget:</span>
                          <p className="font-medium text-slate-900">
                            {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-xs">Deadline:</span>
                          <p className="font-medium text-slate-900">{formatDate(order.deadline)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Button */}
                  <button
                    onClick={() => openChat(order)}
                    className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Открыть чат с клиентом
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Разместить ваш отклик</h3>
              <button
                onClick={() => setShowBidModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-medium text-slate-900">{selectedOrder.title}</p>
              <p className="text-sm text-slate-600">Бюджет: {selectedOrder.budget ? `$${parseFloat(selectedOrder.budget).toFixed(2)}` : 'Не указан'}</p>
            </div>

            <form onSubmit={handleSubmitBid} className="space-y-4">
              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
                  Ваша цена <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={bidData.price}
                    onChange={handleBidInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Days to Complete */}
              <div>
                <label htmlFor="days_to_complete" className="block text-sm font-medium text-slate-700 mb-2">
                  Дней на выполнение <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="days_to_complete"
                  name="days_to_complete"
                  value={bidData.days_to_complete}
                  onChange={handleBidInputChange}
                    placeholder="например, 7"
                  min="1"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
                  required
                />
              </div>

              {/* Comment */}
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
                  Комментарий (опционально)
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  value={bidData.comment}
                  onChange={handleBidInputChange}
                  placeholder="Добавьте дополнительную информацию..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none text-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBidModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition text-sm font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submittingBid}
                  className={`flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition text-sm ${
                    submittingBid ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submittingBid ? 'Отправка...' : 'Отправить отклик'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={closeChat}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Chat Component */}
            <OrderChat
              order={chatOrder}
              currentUser={user}
              currentUserProfile={profile}
              selectedPackerId={user.id}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Manager Dashboard Component
 * Allows managers/admins to view and resolve disputed orders
 */
function ManagerDashboard({ user, profile }) {
  const [disputedOrders, setDisputedOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);
  const [view, setView] = useState('disputed'); // 'disputed' or 'all'
  const [currentUserProfile, setCurrentUserProfile] = useState(profile);
  const fetchingRef = useRef(false); // Защита от дублирования запросов

  // Ban user function (Admin only)
  const handleBanUser = async (userId, userName) => {
    if (!userId) return;
    if (profile?.role !== 'admin') {
      alert('Только администраторы могут блокировать пользователей.');
      return;
    }
    
    const confirmed = confirm(`Вы уверены, что хотите заблокировать пользователя ${userName || 'этого'}? Это действие отключит их доступ к системе.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', userId);

      if (error) {
        console.error('Error banning user:', error);
        alert('Не удалось заблокировать пользователя. Попробуйте еще раз.');
      } else {
        alert(`Пользователь ${userName || ''} успешно заблокирован.`);
        fetchAllOrders(); // Refresh the list
        fetchDisputedOrders(); // Refresh disputed orders too
      }
    } catch (error) {
      console.error('Error in handleBanUser:', error);
      alert('Произошла непредвиденная ошибка.');
    }
  }

  useEffect(() => {
    // Проверяем, что пользователь и профиль загружены, и что это менеджер/админ
    if (user && profile && profile.role && (profile.role === USER_ROLES.MANAGER || profile.role === USER_ROLES.ADMIN)) {
      // Защита от дублирования запросов (особенно в React.StrictMode)
      if (fetchingRef.current) {
        return;
      }
      fetchingRef.current = true;

      // Проверяем, что сессия установлена перед запросом
      // Добавляем небольшую задержку, чтобы убедиться, что токен полностью установлен
      const checkSessionAndFetch = async () => {
        // Небольшая задержка для гарантии, что токен установлен после авторизации
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Повторная проверка после задержки
        if (!user || !profile) {
          fetchingRef.current = false;
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && session?.access_token) {
          await fetchDisputedOrders();
          await fetchAllOrders();
        } else {
          console.warn('Session or token not ready, skipping fetch');
        }
        fetchingRef.current = false;
      };
      checkSessionAndFetch();
    } else {
      // Если пользователь или профиль не загружены, сбрасываем состояние
      fetchingRef.current = false;
    }
  }, [user, profile]);

  const fetchDisputedOrders = async () => {
    // Дополнительная проверка перед запросом
    if (!user || !profile) {
      return;
    }

    // Проверяем сессию и токен перед запросом
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session?.user || !session?.access_token) {
      console.warn('Session or token not available, skipping disputed orders fetch', sessionError);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id (full_name),
          packer:accepted_packer_id (full_name)
        `)
        .eq('is_disputed', true)
        .order('created_at', { ascending: false });

      if (error) {
        // Не показываем ошибку пользователю - это может быть нормальная ситуация
        // (нет спорных заказов, временная проблема сети, и т.д.)
        console.warn('Error fetching disputed orders (non-critical):', error);
        // Всегда устанавливаем пустой массив при ошибке, чтобы не показывать ошибку пользователю
        setDisputedOrders([]);
      } else {
        setDisputedOrders(data || []);
      }
    } catch (error) {
      console.error('Error in fetchDisputedOrders:', error);
      // В случае исключения устанавливаем пустой массив вместо показа ошибки
      setDisputedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id (full_name),
          packer:accepted_packer_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent 50 orders

      if (error) {
        console.error('Error fetching all orders:', error);
      } else {
        setAllOrders(data || []);
      }
    } catch (error) {
      console.error('Error in fetchAllOrders:', error);
    }
  };

  const openChat = (order) => {
    setChatOrder(order);
  };

  const closeChat = () => {
    setChatOrder(null);
  };

  const handleResolveDispute = async (orderId) => {
    if (!confirm('Отметить этот спор как разрешенный?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_disputed: false })
        .eq('id', orderId);

      if (error) {
        console.error('Error resolving dispute:', error);
        alert('Не удалось разрешить спор.');
        return;
      }

      // Insert system message
      const systemMessageData = {
        order_id: orderId,
        sender_id: user.id,
        content: 'Спор разрешен менеджером. ✅',
        is_system_message: true
      };

      await supabase.from('messages').insert([systemMessageData]);

      alert('Спор успешно разрешен!');
      fetchDisputedOrders();
      fetchAllOrders();
    } catch (error) {
      console.error('Error in handleResolveDispute:', error);
      alert('An unexpected error occurred.');
    }
  };

  const ordersToShow = view === 'disputed' ? disputedOrders : allOrders;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Панель менеджера - Управление заказами
          </h3>
          
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('disputed')}
              className={`px-4 py-2 rounded-md font-medium transition text-sm ${
                view === 'disputed'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Спорные заказы ({disputedOrders.length})
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-md font-medium transition text-sm ${
                view === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Все заказы ({allOrders.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-slate-600">Loading orders...</p>
          </div>
        ) : ordersToShow.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-lg text-slate-600">
              {view === 'disputed' ? 'Нет спорных заказов' : 'Заказы не найдены'}
            </p>
            <p className="text-sm text-slate-500">
              {view === 'disputed' ? 'Все споры разрешены!' : 'Заказы будут отображаться здесь'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ordersToShow.map((order) => (
              <div
                key={order.id}
                className={`border rounded-lg p-5 hover:shadow-sm transition ${
                  order.is_disputed ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-base font-semibold text-slate-900">{order.title}</h4>
                      <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.is_disputed && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600 text-white">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          DISPUTED
                        </span>
                      )}
                    </div>

                    {order.description && (
                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">{order.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs">Клиент:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{order.client?.full_name || 'Неизвестен'}</p>
                          {currentUserProfile?.role === 'admin' && order.client_id && (
                            <button
                              onClick={() => handleBanUser(order.client_id, order.client?.full_name)}
                              className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Заблокировать пользователя"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Упаковщик:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{order.packer?.full_name || 'Не назначен'}</p>
                          {currentUserProfile?.role === 'admin' && order.accepted_packer_id && (
                            <button
                              onClick={() => handleBanUser(order.accepted_packer_id, order.packer?.full_name)}
                              className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Заблокировать пользователя"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Budget:</span>
                        <p className="font-medium text-slate-900">
                          {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Deadline:</span>
                        <p className="font-medium text-slate-900">{formatDateWithTime(order.deadline)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => openChat(order)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Открыть чат
                  </button>

                  {order.is_disputed && (
                    <button
                      onClick={() => handleResolveDispute(order.id)}
                      className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Разрешить спор
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {chatOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={closeChat}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Chat Component */}
            <OrderChat
              order={chatOrder}
              currentUser={user}
              currentUserProfile={profile}
              selectedPackerId={chatOrder.accepted_packer_id}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * OrderCard Component
 * Card representation of an order for the dashboard grid
 */
function OrderCard({ order, bidCount, acceptedPacker, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer"
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white line-clamp-2 flex-1">
          {order.title}
        </h3>
        <span className={`ml-2 flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Товаров</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.items?.length || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Бюджет</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Не задано'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Дедлайн</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatDate(order.deadline)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {order.status === 'searching' ? 'Предложений' : 'Статус'}
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.status === 'searching' ? `${bidCount}` : acceptedPacker || 'Активен'}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <button className="w-full px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition text-sm">
        {order.status === 'searching' ? 'Смотреть предложения' : 'Открыть заказ'}
      </button>
    </div>
  );
}

/**
 * CreateOrderModal Component
 * Modal for creating new orders with Excel import
 */
function CreateOrderModal({ 
  user, importedItems, totalQuantity, showTable, showImportedData, formData, submitting,
  onClose, onFileUpload, onToggleTable, onItemEdit, onDeleteItem, onInputChange, onSubmit 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Создать новый заказ</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Excel Import Section */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Загрузить Excel шаблон (опционально)</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
              Импортируйте товары из Excel файла (.xls, .xlsx, .csv). Данные начинаются со строки 3.
            </p>
            
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={onFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Загрузить файл
                </span>
              </label>
              
              {importedItems.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{importedItems.length} товаров ({totalQuantity} шт.)</span>
                </div>
              )}
            </div>

            {/* Show/Hide Table Button */}
            {showImportedData && importedItems.length > 0 && (
              <button
                onClick={onToggleTable}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {showTable ? 'Скрыть таблицу товаров' : 'Показать таблицу товаров'}
              </button>
            )}
          </div>

          {/* Order Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Название заказа <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={onInputChange}
                placeholder="например, Упаковать 100 футболок"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Описание
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onInputChange}
                placeholder="Предоставьте детали вашего заказа..."
                rows={4}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Бюджет (опционально)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={onInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Дедлайн (опционально)
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={onInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition shadow-sm text-sm ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? 'Создание...' : 'Создать заказ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * OrderFocusView Component
 * Detailed view of a single order with chat-first design
 */
function OrderFocusView({
  order, user, profile, orderBids, loadingBids, acceptingBid, acceptedPackers,
  chatOrder, chatPackerId, showItemsModal,
  onBack, onOpenItems, onCloseItems, onOpenChat, onCloseChat, onAcceptBid, onHirePacker
}) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к панели
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{order.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                {order.status}
              </span>
              {order.items && order.items.length > 0 && (
                <span className="px-3 py-1 rounded-md text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {order.items.length} items
                </span>
              )}
            </div>
          </div>

          {/* View Items Button */}
          {order.items && order.items.length > 0 && (
            <button
              onClick={onOpenItems}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Открыть таблицу товаров
            </button>
          )}
        </div>

        {/* Order Details */}
        {order.description && (
          <p className="text-slate-600 dark:text-slate-400 mb-4">{order.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Бюджет</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {order.budget ? `$${parseFloat(order.budget).toFixed(2)}` : 'Не указан'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Дедлайн</p>
            <p className="font-semibold text-slate-900 dark:text-white">{formatDate(order.deadline)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Создан</p>
            <p className="font-semibold text-slate-900 dark:text-white">{formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Bids Section (for searching status) */}
      {order.status === 'searching' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Предложения от упаковщиков ({orderBids[order.id]?.count || 0})
          </h3>
          
          {loadingBids ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Загрузка предложений...</p>
            </div>
          ) : !orderBids[order.id]?.bids || orderBids[order.id].bids.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
              Предложений пока нет. Упаковщики увидят ваш заказ и скоро откликнутся.
            </p>
          ) : (
            <div className="space-y-3">
              {orderBids[order.id].bids.map((bid) => (
                <div
                  key={bid.id}
                  className={`p-4 rounded-lg border ${
                    bid.status === 'accepted' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold flex-shrink-0">
                        {(bid.profiles?.full_name || 'P')[0].toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{bid.profiles?.full_name || 'Упаковщик'}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Цена:</span>
                            <p className="font-semibold text-slate-900 dark:text-white">${parseFloat(bid.price).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Дней:</span>
                            <p className="font-semibold text-slate-900 dark:text-white">{bid.days_to_complete} дн.</p>
                          </div>
                        </div>
                        {bid.comment && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 italic">"{bid.comment}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenChat(bid.packer_id)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>

                      {bid.status === 'pending' && (
                        <button
                          onClick={() => onAcceptBid(bid, order.id)}
                          disabled={acceptingBid}
                          className={`px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition ${
                            acceptingBid ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Принять
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Section (for booked orders) */}
      {order.status === 'booked' && order.accepted_packer_id && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Чат с упаковщиком</h3>
              {acceptedPackers[order.id] && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Назначен: <span className="font-medium">{acceptedPackers[order.id]}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChat(order.accepted_packer_id)}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Открыть чат
            </button>
          </div>
        </div>
      )}

      {/* Items Table Modal */}
      {showItemsModal && order.items && order.items.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Товары заказа ({order.items.length})</h3>
              <button
                onClick={onCloseItems}
                className="p-2 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-x-auto max-h-[calc(90vh-80px)]">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Артикул</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Название</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Штрихкод</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Особое</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Предподготовка</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Транспорт</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Кол-во</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-3 py-2 text-xs font-medium text-slate-900 dark:text-white">{item.sku}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{item.name}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.barcode || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.special_notes || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.prep_work || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{item.transport_pack || '-'}</td>
                      <td className="px-3 py-2 text-xs text-slate-900 dark:text-white text-right font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <td colSpan="6" className="px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white text-right">Всего товаров:</td>
                    <td className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 text-right">
                      {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            <button
              onClick={onCloseChat}
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <OrderChat
              order={chatOrder}
              currentUser={user}
              currentUserProfile={profile}
              selectedPackerId={chatPackerId}
              onHirePacker={onHirePacker}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Exchange;
