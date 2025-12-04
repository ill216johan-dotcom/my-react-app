import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Phone, Mail, Globe } from 'lucide-react';

const CommercialProposal = ({ calculatorData }) => {
  const {
    savings,
    totalItems,
    currentCost,
    ourCost,
    currentCostPerUnit,
    ourCostPerUnit,
    ffServicesCost,
    deliveryCost,
    wbLogisticsCurrent,
    wbLogisticsOur,
    date,
    warehouseCount
  } = calculatorData;

  // Chart data for comparison
  const chartData = [
    {
      name: 'Ваши текущие затраты',
      'Логистика WB': Math.round(wbLogisticsCurrent / totalItems),
      'Фулфилмент': Math.round((currentCost - wbLogisticsCurrent) / totalItems)
    },
    {
      name: 'С нашим решением',
      'Логистика WB': Math.round(wbLogisticsOur / totalItems),
      'Фулфилмент': Math.round((ourCost - wbLogisticsOur) / totalItems)
    }
  ];

  return (
    <div 
      id="commercial-proposal-pdf" 
      style={{
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20mm',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        borderBottom: '3px solid #6366f1',
        paddingBottom: '15px',
        marginBottom: '25px'
      }}>
        <div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#6366f1',
            marginBottom: '8px'
          }}>
            FulFillPro
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <Phone size={12} />
              <span>+7 (495) 123-45-67</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <Mail size={12} />
              <span>info@fulfillpro.ru</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={12} />
              <span>www.fulfillpro.ru</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>Дата</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            {date || new Date().toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      {/* Title */}
      <h1 style={{ 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: '#111827',
        marginBottom: '10px',
        textAlign: 'center'
      }}>
        Коммерческое предложение
      </h1>
      <p style={{ 
        fontSize: '16px', 
        color: '#6366f1',
        marginBottom: '30px',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        по услугам фулфилмента для Wildberries
      </p>

      {/* Savings Summary - Highlight Box */}
      <div style={{
        backgroundColor: '#ecfdf5',
        border: '2px solid #10b981',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
          ✨ ВАША ЭКОНОМИЯ
        </div>
        <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#059669', marginBottom: '5px' }}>
          {savings > 0 ? '+' : ''}{Math.round(savings).toLocaleString('ru-RU')} ₽
        </div>
        <div style={{ fontSize: '12px', color: '#047857' }}>
          на партию из {totalItems.toLocaleString('ru-RU')} единиц товара
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#065f46',
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#d1fae5',
          borderRadius: '6px'
        }}>
          Экономия достигается за счет оптимизации индекса локализации до <strong>0.7</strong> 
          {warehouseCount > 0 && ` и распределения по ${warehouseCount} складам`}
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '15px',
          borderLeft: '4px solid #6366f1',
          paddingLeft: '12px'
        }}>
          Сравнение затрат на единицу товара
        </h2>
        <div style={{ height: '280px', width: '100%', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '15px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={110}
                tick={{ fontSize: 11, fontWeight: 600, fill: '#374151' }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  fontSize: '12px'
                }} 
              />
              <Bar dataKey="Фулфилмент" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Логистика WB" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Cost Breakdown Table */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '15px',
          borderLeft: '4px solid #6366f1',
          paddingLeft: '12px'
        }}>
          Детальная разбивка затрат
        </h2>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb'
              }}>
                Статья расходов
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'right', 
                fontWeight: '600',
                color: '#374151',
                borderBottom: '2px solid #e5e7eb'
              }}>
                Текущие затраты
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'right', 
                fontWeight: '600',
                color: '#6366f1',
                backgroundColor: '#eef2ff',
                borderBottom: '2px solid #e5e7eb'
              }}>
                С нашим решением
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px' }}>
                <strong>Логистика Wildberries</strong>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  Тариф × Коэф. склада × Индекс локализации
                </div>
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                {Math.round(wbLogisticsCurrent).toLocaleString('ru-RU')} ₽
              </td>
              <td style={{ 
                padding: '10px', 
                textAlign: 'right', 
                fontWeight: 'bold',
                color: '#10b981',
                backgroundColor: '#f0fdf4'
              }}>
                {Math.round(wbLogisticsOur).toLocaleString('ru-RU')} ₽
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px' }}>
                <strong>Доставка до складов WB</strong>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  Наша логистика коробов
                </div>
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                {Math.round(deliveryCost).toLocaleString('ru-RU')} ₽
              </td>
              <td style={{ 
                padding: '10px', 
                textAlign: 'right', 
                fontWeight: 'bold',
                color: '#6366f1',
                backgroundColor: '#f0fdf4'
              }}>
                {Math.round(deliveryCost).toLocaleString('ru-RU')} ₽
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px' }}>
                <strong>Услуги фулфилмента</strong>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  Приемка, хранение, упаковка, маркировка
                </div>
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                {Math.round(ffServicesCost).toLocaleString('ru-RU')} ₽
              </td>
              <td style={{ 
                padding: '10px', 
                textAlign: 'right', 
                fontWeight: 'bold',
                backgroundColor: '#f0fdf4'
              }}>
                {Math.round(ffServicesCost).toLocaleString('ru-RU')} ₽
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
              <td style={{ padding: '12px', fontSize: '14px' }}>ИТОГО</td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                {Math.round(currentCost).toLocaleString('ru-RU')} ₽
              </td>
              <td style={{ 
                padding: '12px', 
                textAlign: 'right', 
                fontSize: '14px',
                color: '#6366f1',
                backgroundColor: '#eef2ff'
              }}>
                {Math.round(ourCost).toLocaleString('ru-RU')} ₽
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Why Choose Us Section */}
      <div style={{ 
        marginBottom: '30px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          Почему стоит работать с нами?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '50%',
              marginBottom: '10px'
            }}>
              <CheckCircle2 size={24} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
              Скорость
            </h3>
            <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
              Обработка заказов в день поступления. Быстрая отгрузка на склады маркетплейсов.
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '50%',
              marginBottom: '10px'
            }}>
              <CheckCircle2 size={24} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
              Качество
            </h3>
            <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
              Профессиональная упаковка, контроль качества на каждом этапе, минимум возвратов.
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '50%',
              marginBottom: '10px'
            }}>
              <CheckCircle2 size={24} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
              Прозрачность
            </h3>
            <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
              Онлайн-мониторинг остатков, детальная отчетность, понятные тарифы без скрытых платежей.
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Call to Action */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#6366f1',
        color: '#ffffff',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Готовы начать экономить?
        </h2>
        <p style={{ fontSize: '13px', marginBottom: '15px', opacity: '0.9' }}>
          Запишитесь на бесплатную консультацию, и мы подберем оптимальное решение для вашего бизнеса
        </p>
        <div style={{ 
          display: 'inline-block',
          backgroundColor: '#ffffff',
          color: '#6366f1',
          padding: '12px 30px',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          📞 Записаться на звонок: +7 (495) 123-45-67
        </div>
      </div>

      {/* Small Footer */}
      <div style={{ 
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        fontSize: '10px',
        color: '#9ca3af'
      }}>
        <p>ООО "FulFillPro" | ИНН 1234567890 | КПП 123456789</p>
        <p>Москва, ул. Примерная, д. 1 | info@fulfillpro.ru</p>
      </div>
    </div>
  );
};

export default CommercialProposal;




