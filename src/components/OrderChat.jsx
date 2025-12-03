import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { USER_ROLES } from '../db_schema';

/**
 * OrderChat Component
 * 
 * A real-time chat system with arbitration support.
 * - Shows chat between Client and Packer(s)
 * - Real-time updates via Supabase channels
 * - Arbitration system for dispute resolution
 * - Context-aware based on order status
 */
function OrderChat({ order, currentUser, currentUserProfile, selectedPackerId = null, onHirePacker = null }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [packerInfo, setPackerInfo] = useState(null);
  const [loadingPacker, setLoadingPacker] = useState(false);
  const [logisticsCost, setLogisticsCost] = useState(order.logistics_cost || '');
  const [savingLogistics, setSavingLogistics] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Determine the "room" context
  const isSearchingStatus = order.status === 'searching';
  const isBooked = order.status === 'booked';
  const isCompleted = order.status === 'completed';
  const isClient = currentUserProfile?.role === USER_ROLES.CLIENT;
  const isPacker = currentUserProfile?.role === USER_ROLES.PACKER;
  const isManager = currentUserProfile?.role === USER_ROLES.MANAGER || currentUserProfile?.role === USER_ROLES.ADMIN;
  const isAdmin = currentUserProfile?.role === USER_ROLES.ADMIN;

  // Determine which packer we're chatting with
  const relevantPackerId = isSearchingStatus ? selectedPackerId : order.accepted_packer_id;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch packer info
  useEffect(() => {
    if (relevantPackerId) {
      fetchPackerInfo(relevantPackerId);
    }
  }, [relevantPackerId]);

  // Fetch messages
  useEffect(() => {
    if (order && currentUser) {
      fetchMessages();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [order.id, relevantPackerId]);

  const fetchPackerInfo = async (packerId) => {
    if (!packerId) return;
    
    setLoadingPacker(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', packerId)
        .single();

      if (error) {
        console.error('Error fetching packer info:', error);
      } else {
        setPackerInfo(data);
      }
    } catch (error) {
      console.error('Error in fetchPackerInfo:', error);
    } finally {
      setLoadingPacker(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            full_name,
            role
          )
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      // Filter by relevant_packer_id if in searching status
      if (isSearchingStatus && relevantPackerId) {
        query = query.eq('relevant_packer_id', relevantPackerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Remove existing subscription if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create a unique channel name for this chat
    const channelName = `messages:order_${order.id}${relevantPackerId ? `_packer_${relevantPackerId}` : ''}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${order.id}`
        },
        (payload) => {
          // Only add message if it's for the current chat context
          if (isSearchingStatus && relevantPackerId) {
            if (payload.new.relevant_packer_id === relevantPackerId) {
              fetchMessageWithSender(payload.new.id);
            }
          } else {
            fetchMessageWithSender(payload.new.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const fetchMessageWithSender = async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            full_name,
            role
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) {
        console.error('Error fetching new message:', error);
      } else {
        setMessages(prev => {
          // Check if message already exists
          if (prev.some(m => m.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
      }
    } catch (error) {
      console.error('Error in fetchMessageWithSender:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    try {
      const messageData = {
        order_id: order.id,
        sender_id: currentUser.id,
        relevant_packer_id: relevantPackerId || null,
        content: newMessage.trim(),
        is_system_message: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select();

      if (error) {
        console.error('Error sending message:', error);
        alert('Не удалось отправить сообщение. Попробуйте еще раз.');
      } else {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      alert('Произошла непредвиденная ошибка.');
    } finally {
      setSending(false);
    }
  };

  const handleCallArbitration = async () => {
    if (!confirm('Позвать арбитраж? Менеджер будет вызван для разрешения этого спора.')) {
      return;
    }

    try {
      // Update order to set is_disputed = true
      const { error: orderError } = await supabase
        .from('orders')
        .update({ is_disputed: true })
        .eq('id', order.id);

      if (orderError) {
        console.error('Error updating order:', orderError);
        alert('Не удалось позвать арбитраж. Попробуйте еще раз.');
        return;
      }

      // Insert system message
      const systemMessageData = {
        order_id: order.id,
        sender_id: currentUser.id,
        relevant_packer_id: relevantPackerId || null,
        content: 'Арбитраж начат. Менеджер вызван. 🚨',
        is_system_message: true
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert([systemMessageData]);

      if (messageError) {
        console.error('Error inserting system message:', messageError);
      }

      alert('Арбитраж вызван. Менеджер скоро рассмотрит этот случай.');
      
      // Refresh to show updated state
      window.location.reload();
    } catch (error) {
      console.error('Error in handleCallArbitration:', error);
      alert('Произошла непредвиденная ошибка.');
    }
  };

  // Check if arbitration button should be shown
  const shouldShowArbitrationButton = () => {
    // Only show for booked or completed orders that are not already disputed
    if (!isBooked && !isCompleted) return false;
    if (order.is_disputed) return false;
    
    // Check if deadline has passed
    if (order.deadline) {
      const deadline = new Date(order.deadline);
      const now = new Date();
      if (now > deadline) return true;
    }
    
    // For now, always allow arbitration for booked/completed orders
    // In production, you might want additional conditions
    return true;
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleLogisticsCostUpdate = async () => {
    if (!isManager && !isAdmin) return;

    setSavingLogistics(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ logistics_cost: parseFloat(logisticsCost) || 0 })
        .eq('id', order.id);

      if (error) {
        console.error('Error updating logistics cost:', error);
        alert('Не удалось обновить стоимость логистики.');
      } else {
        alert('Стоимость логистики обновлена успешно!');
      }
    } catch (error) {
      console.error('Error in handleLogisticsCostUpdate:', error);
      alert('Произошла непредвиденная ошибка.');
    } finally {
      setSavingLogistics(false);
    }
  };

  // Determine if manager/admin can send messages
  const canSendMessage = () => {
    if (isClient || isPacker) return true;
    if (isManager && order.is_disputed) return true;
    return false;
  };

  if (!relevantPackerId && isSearchingStatus) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-slate-600">Выберите заявку, чтобы начать общение с упаковщиком</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isClient ? (
                <>Чат с {loadingPacker ? '...' : (packerInfo?.full_name || 'упаковщиком')}</>
              ) : isPacker ? (
                <>Чат с клиентом</>
              ) : (
                <>Чат заказа (Вид менеджера)</>
              )}
            </h3>
            <p className="text-sm text-slate-500 mt-1 flex items-center">
              <span>Заказ: {order.title}</span>
              {order.is_disputed && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  СПОР
                </span>
              )}
            </p>
          </div>

          {/* Hire Button (Only for Client in searching status) */}
          {isClient && isSearchingStatus && relevantPackerId && onHirePacker && (
            <button
              onClick={() => onHirePacker(relevantPackerId)}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition shadow-sm text-sm"
            >
              Нанять упаковщика
            </button>
          )}
        </div>

        {/* Observer Mode Banner for Manager/Admin */}
        {isManager && (
          <div className={`mt-4 px-4 py-2 rounded-md border ${
            order.is_disputed 
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {order.is_disputed ? 'Режим арбитража активен' : 'Режим наблюдателя'}
            </div>
            <p className="text-xs mt-1 opacity-80">
              {order.is_disputed 
                ? 'Вы можете отправлять сообщения для разрешения спора'
                : 'Вы можете только читать сообщения. Отправка доступна при активном споре.'}
            </p>
          </div>
        )}

        {/* Logistics Cost Section (Visible to all, editable by Manager/Admin) */}
        <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Стоимость логистики фулфилмент короба
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={logisticsCost}
              onChange={(e) => setLogisticsCost(e.target.value)}
              disabled={!isManager && !isAdmin}
              className={`flex-1 px-3 py-2 text-sm border rounded-md transition ${
                isManager || isAdmin
                  ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                  : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'
              }`}
              placeholder="Введите стоимость"
            />
            {(isManager || isAdmin) && (
              <button
                onClick={handleLogisticsCostUpdate}
                disabled={savingLogistics}
                className={`px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition shadow-sm ${
                  savingLogistics ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {savingLogistics ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
          </div>
          {!isManager && !isAdmin && (
            <p className="text-xs text-slate-500 mt-1">
              Только менеджер или администратор может изменить это значение
            </p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-slate-600">Загрузка сообщений...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-slate-600">Сообщений пока нет</p>
              <p className="text-sm text-slate-500 mt-1">Начните разговор!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isMyMessage = message.sender_id === currentUser.id;
              const isSystemMessage = message.is_system_message;

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm font-medium shadow-sm">
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg px-4 py-3 shadow-sm ${
                        isMyMessage
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      {!isMyMessage && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {message.sender?.full_name || 'Неизвестный'}
                          {message.sender?.role === USER_ROLES.MANAGER && ' (Менеджер)'}
                          {message.sender?.role === USER_ROLES.ADMIN && ' (Админ)'}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isMyMessage ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-6 py-4">
        {/* Arbitration Button */}
        {shouldShowArbitrationButton() && !order.is_disputed && !isManager && (
          <div className="mb-4">
            <button
              onClick={handleCallArbitration}
              className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Позвать арбитраж
            </button>
          </div>
        )}

        {/* Message Input Form - Only show if user can send messages */}
        {canSendMessage() ? (
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              disabled={sending}
              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className={`px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition shadow-sm flex items-center gap-2 text-sm ${
                sending || !newMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Отправить
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center py-2 text-sm text-slate-500 bg-slate-50 rounded-md border border-slate-200">
            <svg className="w-5 h-5 mx-auto mb-1 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Отправка сообщений отключена (режим наблюдателя)
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderChat;

