import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'uk' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  uk: {
    // Navigation
    'nav.dashboard': 'Панель керування',
    'nav.properties': 'Об\'єкти',
    'nav.reports': 'Звіти',
    'nav.users': 'Користувачі',
    'nav.settings': 'Налаштування',
    'nav.logout': 'Вийти',
    
    // Auth
    'auth.login': 'Увійти',
    'auth.register': 'Реєстрація',
    'auth.email': 'Електронна пошта',
    'auth.password': 'Пароль',
    'auth.confirmPassword': 'Підтвердіть пароль',
    'auth.fullName': 'Повне ім\'я',
    'auth.forgotPassword': 'Забули пароль?',
    'auth.noAccount': 'Немає акаунту?',
    'auth.hasAccount': 'Вже є акаунт?',
    'auth.createAccount': 'Створити акаунт',
    'auth.loginTitle': 'Вхід до системи',
    'auth.registerTitle': 'Реєстрація в системі',
    'auth.welcome': 'Ласкаво просимо',
    'auth.subtitle': 'CRM для агентства нерухомості',
    
    // Dashboard
    'dashboard.title': 'Панель керування',
    'dashboard.welcome': 'Вітаємо',
    'dashboard.totalProperties': 'Всього об\'єктів',
    'dashboard.activeListings': 'Активні оголошення',
    'dashboard.closedDeals': 'Закриті угоди',
    'dashboard.recentActivity': 'Остання активність',
    'dashboard.thisMonth': 'Цього місяця',
    'dashboard.thisWeek': 'Цього тижня',
    
    // Properties
    'properties.title': 'Об\'єкти нерухомості',
    'properties.add': 'Додати об\'єкт',
    'properties.edit': 'Редагувати',
    'properties.delete': 'Видалити',
    'properties.search': 'Пошук об\'єктів...',
    'properties.filter': 'Фільтр',
    'properties.all': 'Всі',
    'properties.address': 'Адреса',
    'properties.owner': 'Власник',
    'properties.ownerName': 'ПІБ власника',
    'properties.ownerPhone': 'Телефон власника',
    'properties.description': 'Опис',
    'properties.type': 'Тип нерухомості',
    'properties.dealType': 'Тип угоди',
    'properties.price': 'Ціна',
    'properties.status': 'Статус',
    'properties.photos': 'Фотографії',
    'properties.link': 'Посилання',
    'properties.importLink': 'Імпортувати з посилання',
    'properties.importPlaceholder': 'Вставте посилання з OLX або DomRia',
    'properties.import': 'Імпортувати',
    'properties.closingAmount': 'Сума закриття',
    'properties.dateFrom': 'З дати',
    'properties.dateTo': 'По дату',
    
    // Property Types
    'property.apartment': 'Квартира',
    'property.house': 'Будинок',
    'property.commercial': 'Комерційна',
    'property.land': 'Земельна ділянка',
    'property.office': 'Офіс',
    'property.other': 'Інше',
    
    // Deal Types
    'deal.sale': 'Продаж',
    'deal.rent': 'Оренда',
    
    // Statuses
    'status.available': 'Доступний',
    'status.sold': 'Продано',
    'status.rented': 'Здано',
    'status.notSold': 'Не продано',
    'status.notRented': 'Не здано',
    
    // Reports
    'reports.title': 'Звіти',
    'reports.create': 'Створити звіт',
    'reports.weekly': 'Щотижневий',
    'reports.monthly': 'Щомісячний',
    'reports.period': 'Період',
    'reports.addedProperties': 'Додані об\'єкти',
    'reports.closedCases': 'Закриті кейси',
    'reports.totalAmount': 'Загальна сума',
    'reports.sign': 'Підписати та відправити',
    'reports.signed': 'Підписано',
    'reports.pending': 'Очікує',
    'reports.manager': 'Менеджер',
    'reports.date': 'Дата',
    
    // Users
    'users.title': 'Користувачі',
    'users.add': 'Додати користувача',
    'users.edit': 'Редагувати',
    'users.delete': 'Видалити',
    'users.role': 'Роль',
    'users.superuser': 'Суперкористувач',
    'users.topManager': 'Топ-менеджер',
    'users.manager': 'Менеджер',
    'users.secretKey': 'Секретний ключ',
    'users.createdAt': 'Створено',
    
    // Common
    'common.save': 'Зберегти',
    'common.cancel': 'Скасувати',
    'common.confirm': 'Підтвердити',
    'common.loading': 'Завантаження...',
    'common.error': 'Помилка',
    'common.success': 'Успішно',
    'common.noData': 'Немає даних',
    'common.actions': 'Дії',
    'common.view': 'Переглянути',
    'common.uah': 'грн',
    'common.usd': '$',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.properties': 'Properties',
    'nav.reports': 'Reports',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.fullName': 'Full Name',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.hasAccount': 'Already have an account?',
    'auth.createAccount': 'Create Account',
    'auth.loginTitle': 'Sign In',
    'auth.registerTitle': 'Create Account',
    'auth.welcome': 'Welcome',
    'auth.subtitle': 'Real Estate Agency CRM',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.totalProperties': 'Total Properties',
    'dashboard.activeListings': 'Active Listings',
    'dashboard.closedDeals': 'Closed Deals',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.thisMonth': 'This Month',
    'dashboard.thisWeek': 'This Week',
    
    // Properties
    'properties.title': 'Properties',
    'properties.add': 'Add Property',
    'properties.edit': 'Edit',
    'properties.delete': 'Delete',
    'properties.search': 'Search properties...',
    'properties.filter': 'Filter',
    'properties.all': 'All',
    'properties.address': 'Address',
    'properties.owner': 'Owner',
    'properties.ownerName': 'Owner Name',
    'properties.ownerPhone': 'Owner Phone',
    'properties.description': 'Description',
    'properties.type': 'Property Type',
    'properties.dealType': 'Deal Type',
    'properties.price': 'Price',
    'properties.status': 'Status',
    'properties.photos': 'Photos',
    'properties.link': 'Link',
    'properties.importLink': 'Import from Link',
    'properties.importPlaceholder': 'Paste link from OLX or DomRia',
    'properties.import': 'Import',
    'properties.closingAmount': 'Closing Amount',
    'properties.dateFrom': 'From Date',
    'properties.dateTo': 'To Date',
    
    // Property Types
    'property.apartment': 'Apartment',
    'property.house': 'House',
    'property.commercial': 'Commercial',
    'property.land': 'Land',
    'property.office': 'Office',
    'property.other': 'Other',
    
    // Deal Types
    'deal.sale': 'Sale',
    'deal.rent': 'Rent',
    
    // Statuses
    'status.available': 'Available',
    'status.sold': 'Sold',
    'status.rented': 'Rented',
    'status.notSold': 'Not Sold',
    'status.notRented': 'Not Rented',
    
    // Reports
    'reports.title': 'Reports',
    'reports.create': 'Create Report',
    'reports.weekly': 'Weekly',
    'reports.monthly': 'Monthly',
    'reports.period': 'Period',
    'reports.addedProperties': 'Added Properties',
    'reports.closedCases': 'Closed Cases',
    'reports.totalAmount': 'Total Amount',
    'reports.sign': 'Sign & Send',
    'reports.signed': 'Signed',
    'reports.pending': 'Pending',
    'reports.manager': 'Manager',
    'reports.date': 'Date',
    
    // Users
    'users.title': 'Users',
    'users.add': 'Add User',
    'users.edit': 'Edit',
    'users.delete': 'Delete',
    'users.role': 'Role',
    'users.superuser': 'Superuser',
    'users.topManager': 'Top Manager',
    'users.manager': 'Manager',
    'users.secretKey': 'Secret Key',
    'users.createdAt': 'Created At',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.noData': 'No Data',
    'common.actions': 'Actions',
    'common.view': 'View',
    'common.uah': 'UAH',
    'common.usd': '$',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('crm-language');
    return (saved as Language) || 'uk';
  });

  useEffect(() => {
    localStorage.setItem('crm-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['uk']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
