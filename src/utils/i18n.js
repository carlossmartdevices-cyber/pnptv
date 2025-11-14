/**
 * Internationalization (i18n) - English and Spanish
 */

import i18next from 'i18next';

/**
 * Translation strings
 */
const translations = {
  en: {
    // Common
    back: '🔙 Back',
    cancel: '❌ Cancel',
    confirm: '✅ Confirm',
    next: '➡️ Next',
    skip: '⏭️ Skip',
    save: '💾 Save',
    edit: '✏️ Edit',
    delete: '🗑️ Delete',
    close: '❌ Close',
    loading: '⏳ Loading...',
    error: '❌ An error occurred. Please try again.',
    success: '✅ Success!',

    // Onboarding
    welcome: '👋 Welcome to PNPtv!',
    selectLanguage: 'Please select your language:',
    languageEn: '🇺🇸 English',
    languageEs: '🇪🇸 Español',
    ageConfirmation: 'Are you 18 years or older?',
    ageYes: '✅ Yes, I am 18+',
    ageNo: '❌ No',
    ageRestriction: '⚠️ Sorry, you must be 18+ to use this bot.',
    termsAcceptance: 'Please read and accept our Terms of Service and Privacy Policy:',
    termsButton: '📄 Terms of Service',
    privacyButton: '🔒 Privacy Policy',
    acceptTerms: '✅ I Accept',
    declineTerms: '❌ Decline',
    termsDeclined: '⚠️ You must accept the terms to continue.',
    emailRequest: 'Would you like to provide your email for updates? (Optional)',
    emailSkip: '⏭️ Skip',
    emailInvalid: '❌ Invalid email format. Please try again.',
    onboardingComplete: '🎉 Setup complete! Welcome to PNPtv!',

    // Main Menu
    mainMenuIntro: '🎬 *PNPtv - Your Entertainment Hub*\\n\\nWhat would you like to do?',
    becomeMember: '💎 Become a member',
    myProfile: '👤 Mi Profile',
    nearbyUsers: '🌍 Nearby Users',
    liveStreams: '🎤 Live Streams',
    radio: '📻 Radio',
    zoomRooms: '🎥 Zoom Rooms',
    support: '🤖 Support',
    settings: '⚙️ Settings',

    // Subscriptions
    subscriptionPlans: '💎 *Subscription Plans*\\n\\nChoose your plan:',
    planBasic: '🥉 Basic - $9.99/month',
    planPremium: '🥈 Premium - $19.99/month',
    planGold: '🥇 Gold - $29.99/month',
    planBasicDesc: '✓ Radio access\\n✓ Basic profile\\n✓ Limited live streams',
    planPremiumDesc: '✓ All Basic features\\n✓ Unlimited live streams\\n✓ Zoom rooms\\n✓ Priority support',
    planGoldDesc: '✓ All Premium features\\n✓ Nearby users map\\n✓ Ad-free experience\\n✓ VIP badge',
    selectPaymentMethod: 'Select payment method:',
    paymentEpayco: '💳 Pay with ePayco (Card/Cash)',
    paymentDaimo: '🪙 Pay with Daimo (USDC)',
    paymentInstructions: '💳 *Payment Instructions*\\n\\nClick the link below to complete your payment:',
    paymentPending: '⏳ Payment pending... We will notify you once confirmed.',
    paymentSuccess: '🎉 Payment successful! Your PRIME subscription is now active.',
    paymentFailed: '❌ Payment failed. Please try again or contact support.',
    subscriptionActive: '✅ You have an active {plan} subscription.',
    subscriptionExpired: '⚠️ Your subscription has expired. Renew to continue enjoying premium features.',
    subscriptionExpiry: 'Expires: {date}',

    // Profile
    profileView: '👤 *Your Profile*\\n\\n*Username:* {username}\\n*Status:* {status}\\n*Plan:* {plan}\\n*Member since:* {joinDate}',
    editProfile: '✏️ Edit Profile',
    editPhoto: '📸 Change Photo',
    editBio: '📝 Edit Bio',
    editLocation: '📍 Update Location',
    editInterests: '🎯 Edit Interests',
    sendNewPhoto: '📸 Please send your new profile photo:',
    sendNewBio: '📝 Please enter your new bio (max 500 characters):',
    sendLocation: '📍 Please share your location:',
    bioTooLong: '❌ Bio is too long. Maximum 500 characters.',
    profileUpdated: '✅ Profile updated successfully!',
    viewProfile: '👁️ View Profile',

    // Nearby Users
    nearbyUsersIntro: '🌍 *Find People Nearby*\\n\\nSelect search radius:',
    radius5km: '📍 5 km',
    radius10km: '📍 10 km',
    radius25km: '📍 25 km',
    nearbyUsersFound: '🌍 Found {count} users within {radius}km:',
    noNearbyUsers: '😔 No users found nearby. Try a larger radius.',
    distance: 'Distance: {distance}km',
    viewMap: '🗺️ View on Map',
    sendMessage: '💬 Send Message',

    // Live Streams
    liveStreamsIntro: '🎤 *Live Streams*\\n\\nWhat would you like to do?',
    startLive: '🔴 Start Live Stream',
    viewLive: '👁️ View Live Streams',
    myStreams: '📺 My Streams',
    enterStreamTitle: '🎤 Enter a title for your live stream:',
    streamCreated: '✅ Your live stream is ready!\\n\\n🔗 *Link:* {link}\\n\\nShare this link with your audience!',
    activeStreams: '🎤 *Active Live Streams* ({count})',
    noActiveStreams: '😔 No active streams right now. Be the first to go live!',
    joinStream: '▶️ Join Stream',
    endStream: '⏹️ End Stream',
    streamEnded: '✅ Stream ended successfully.',
    viewerCount: '👁️ {count} viewers',

    // Radio
    radioIntro: '📻 *PNPtv Radio*\\n\\nYour 24/7 music station!',
    listenNow: '▶️ Listen Now',
    requestSong: '🎵 Request a Song',
    nowPlaying: '🎵 Now Playing: {song}',
    radioSchedule: '📅 Schedule',
    songRequestPrompt: '🎵 What song would you like to hear?',
    songRequestAdded: '✅ Your request has been added to the queue!',
    radioPlaying: '▶️ Enjoy PNPtv Radio!',

    // Zoom Rooms
    zoomRoomsIntro: '🎥 *Zoom Rooms*\\n\\nCreate or join video meetings:',
    createRoom: '➕ Create New Room',
    joinRoom: '▶️ Join Room',
    myRooms: '📋 My Rooms',
    enterRoomName: '🎥 Enter a name for your room:',
    roomPrivacy: 'Room privacy:',
    roomPublic: '🌐 Public',
    roomPrivate: '🔒 Private',
    roomCreated: '✅ Room created!\\n\\n🔗 *Link:* {link}\\n\\n💡 Share this link to invite participants.',
    activeRooms: '🎥 *Active Rooms* ({count})',
    noActiveRooms: '😔 No active rooms. Create one now!',
    roomJoined: '✅ Joining room...',

    // Admin Panel
    adminPanel: '👨‍💼 *Admin Panel*\\n\\nSelect an action:',
    adminBroadcast: '📢 Broadcast Message',
    adminUsers: '👥 User Management',
    adminPlans: '💎 Manage Plans',
    adminAnalytics: '📊 Analytics',
    broadcastWizard: '📢 *Broadcast Wizard*\\n\\nStep 1: Select audience',
    broadcastAllUsers: '👥 All Users',
    broadcastPremiumOnly: '💎 Premium Users Only',
    broadcastFreeOnly: '🆓 Free Users Only',
    broadcastByLanguage: '🌐 By Language',
    broadcastEnglish: '🇺🇸 English Users',
    broadcastSpanish: '🇪🇸 Spanish Users',
    broadcastMessagePrompt: '📝 Enter your broadcast message (text, photo, or video):',
    broadcastConfirm: '📢 Send to {count} users?',
    broadcastSent: '✅ Broadcast sent to {count} users!',
    broadcastCancelled: '❌ Broadcast cancelled.',
    userSearch: '🔍 Enter user ID or username to search:',
    userNotFound: '❌ User not found.',
    userActions: '👤 *User: @{username}*\\n\\nSelect action:',
    extendSubscription: '⏰ Extend Subscription',
    deactivateUser: '🚫 Deactivate User',
    activateUser: '✅ Activate User',
    userUpdated: '✅ User updated successfully.',

    // Support
    supportIntro: '🤖 *Support Center*\\n\\nHow can we help?',
    chatWithAI: '🤖 Chat with Cristina (AI)',
    contactAdmin: '👨‍💼 Contact Admin',
    faq: '❓ FAQ',
    aiChatActive: '🤖 *Cristina AI Assistant*\\n\\nAsk me anything! Type /menu to return to main menu.',
    contactAdminPrompt: '👨‍💼 Please describe your issue and an admin will contact you soon:',
    supportTicketCreated: '✅ Support ticket created! Our team will contact you soon.',

    // Settings
    settingsIntro: '⚙️ *Settings*\\n\\nConfigure your preferences:',
    changeLanguage: '🌐 Change Language',
    privacySettings: '🔒 Privacy Settings',
    notificationSettings: '🔔 Notifications',
    languageChanged: '✅ Language changed to English.',
    privacyIntro: '🔒 *Privacy Settings*',
    showProfile: 'Show my profile in nearby search',
    showOnline: 'Show when I\'m online',
    allowMessages: 'Allow messages from strangers',
    settingsSaved: '✅ Settings saved!',

    // Membership Notifications
    membershipActivated: '✅ Membership Activated',
    congratulations: 'Congratulations',
    yourPlan: 'Your Plan',
    tier: 'Tier',
    expiresOn: 'Expires On',
    yourFeatures: 'Your Features',
    yourInviteCode: 'Your Invite Code',
    shareInviteCode: 'Share this code with friends to give them access!',
    expirationWarning: 'Membership Expiring Soon',
    yourMembership: 'Your Membership',
    expiresIn: 'expires in',
    days: 'days',
    expiryDate: 'Expiry Date',
    renewNowMessage: '💡 Renew now to keep your premium access!',
    renewNow: '🔄 Renew Now',
    dismiss: '❌ Dismiss',
    finalReminder: 'Final Reminder',
    afterExpirationMessage: 'After expiration, you will be downgraded to Free tier.',
    renewNowToKeepAccess: '🔄 Renew now to keep your premium access without interruption!',
    membershipExpired: 'Membership Expired',
    yourMembershipHasExpired: 'Your membership has expired and you have been downgraded to Free tier.',
    previousTier: 'Previous Tier',
    currentTier: 'Current Tier',
    renewToReactivate: 'Renew your membership to reactivate premium features!',
    inviteLinkGenerated: 'Invite Link Generated',
    inviteLink: 'Invite Link',
    maxUses: 'Max Uses',
    shareWithFriends: 'Share this link with friends!',
    shareLink: 'Share Link',
    backToMenu: 'Back to Menu',
    inviteUsed: 'Invite Code Used',
    newUserJoined: 'A new user joined using your invite code',
    thankYouForSharing: 'Thank you for sharing PNPtv!',

    // Errors
    unauthorized: '⛔ Unauthorized. This command is for admins only.',
    notSubscribed: '⚠️ This feature requires a PRIME subscription.',
    locationRequired: '📍 Please share your location first in your profile.',
    invalidInput: '❌ Invalid input. Please try again.',
    serverError: '❌ Server error. Our team has been notified.',
    maintenanceMode: '🔧 Bot is under maintenance. Please try again later.',
  },

  es: {
    // Common
    back: '🔙 Atrás',
    cancel: '❌ Cancelar',
    confirm: '✅ Confirmar',
    next: '➡️ Siguiente',
    skip: '⏭️ Saltar',
    save: '💾 Guardar',
    edit: '✏️ Editar',
    delete: '🗑️ Eliminar',
    close: '❌ Cerrar',
    loading: '⏳ Cargando...',
    error: '❌ Ocurrió un error. Por favor intenta de nuevo.',
    success: '✅ ¡Éxito!',

    // Onboarding
    welcome: '👋 ¡Bienvenido a PNPtv!',
    selectLanguage: 'Por favor selecciona tu idioma:',
    languageEn: '🇺🇸 English',
    languageEs: '🇪🇸 Español',
    ageConfirmation: '¿Tienes 18 años o más?',
    ageYes: '✅ Sí, tengo 18+',
    ageNo: '❌ No',
    ageRestriction: '⚠️ Lo sentimos, debes tener 18+ para usar este bot.',
    termsAcceptance: 'Por favor lee y acepta nuestros Términos de Servicio y Política de Privacidad:',
    termsButton: '📄 Términos de Servicio',
    privacyButton: '🔒 Política de Privacidad',
    acceptTerms: '✅ Acepto',
    declineTerms: '❌ Rechazar',
    termsDeclined: '⚠️ Debes aceptar los términos para continuar.',
    emailRequest: '¿Te gustaría proporcionar tu email para actualizaciones? (Opcional)',
    emailSkip: '⏭️ Saltar',
    emailInvalid: '❌ Formato de email inválido. Por favor intenta de nuevo.',
    onboardingComplete: '🎉 ¡Configuración completa! ¡Bienvenido a PNPtv!',

    // Main Menu
    mainMenuIntro: '🎬 *PNPtv - Tu Centro de Entretenimiento*\\n\\n¿Qué te gustaría hacer?',
    becomeMember: '💎 Hacerse miembro',
    myProfile: '👤 Mi Perfil',
    nearbyUsers: '🌍 Usuarios Cercanos',
    liveStreams: '🎤 Transmisiones en Vivo',
    radio: '📻 Radio',
    zoomRooms: '🎥 Salas Zoom',
    support: '🤖 Soporte',
    settings: '⚙️ Configuración',

    // Subscriptions
    subscriptionPlans: '💎 *Planes de Suscripción*\\n\\nElige tu plan:',
    planBasic: '🥉 Básico - $9.99/mes',
    planPremium: '🥈 Premium - $19.99/mes',
    planGold: '🥇 Oro - $29.99/mes',
    planBasicDesc: '✓ Acceso a radio\\n✓ Perfil básico\\n✓ Transmisiones limitadas',
    planPremiumDesc: '✓ Todas las características básicas\\n✓ Transmisiones ilimitadas\\n✓ Salas Zoom\\n✓ Soporte prioritario',
    planGoldDesc: '✓ Todas las características premium\\n✓ Mapa de usuarios cercanos\\n✓ Experiencia sin anuncios\\n✓ Insignia VIP',
    selectPaymentMethod: 'Selecciona método de pago:',
    paymentEpayco: '💳 Pagar con ePayco (Tarjeta/Efectivo)',
    paymentDaimo: '🪙 Pagar con Daimo (USDC)',
    paymentInstructions: '💳 *Instrucciones de Pago*\\n\\nHaz clic en el enlace para completar tu pago:',
    paymentPending: '⏳ Pago pendiente... Te notificaremos cuando se confirme.',
    paymentSuccess: '🎉 ¡Pago exitoso! Tu suscripción PRIME está ahora activa.',
    paymentFailed: '❌ Pago fallido. Por favor intenta de nuevo o contacta soporte.',
    subscriptionActive: '✅ Tienes una suscripción {plan} activa.',
    subscriptionExpired: '⚠️ Tu suscripción ha expirado. Renueva para continuar disfrutando características premium.',
    subscriptionExpiry: 'Expira: {date}',

    // Profile
    profileView: '👤 *Tu Perfil*\\n\\n*Usuario:* {username}\\n*Estado:* {status}\\n*Plan:* {plan}\\n*Miembro desde:* {joinDate}',
    editProfile: '✏️ Editar Perfil',
    editPhoto: '📸 Cambiar Foto',
    editBio: '📝 Editar Bio',
    editLocation: '📍 Actualizar Ubicación',
    editInterests: '🎯 Editar Intereses',
    sendNewPhoto: '📸 Por favor envía tu nueva foto de perfil:',
    sendNewBio: '📝 Por favor ingresa tu nueva bio (máx 500 caracteres):',
    sendLocation: '📍 Por favor comparte tu ubicación:',
    bioTooLong: '❌ Bio demasiado larga. Máximo 500 caracteres.',
    profileUpdated: '✅ ¡Perfil actualizado exitosamente!',
    viewProfile: '👁️ Ver Perfil',

    // Nearby Users
    nearbyUsersIntro: '🌍 *Encuentra Personas Cercanas*\\n\\nSelecciona radio de búsqueda:',
    radius5km: '📍 5 km',
    radius10km: '📍 10 km',
    radius25km: '📍 25 km',
    nearbyUsersFound: '🌍 Se encontraron {count} usuarios dentro de {radius}km:',
    noNearbyUsers: '😔 No se encontraron usuarios cercanos. Prueba un radio mayor.',
    distance: 'Distancia: {distance}km',
    viewMap: '🗺️ Ver en Mapa',
    sendMessage: '💬 Enviar Mensaje',

    // Live Streams
    liveStreamsIntro: '🎤 *Transmisiones en Vivo*\\n\\n¿Qué te gustaría hacer?',
    startLive: '🔴 Iniciar Transmisión',
    viewLive: '👁️ Ver Transmisiones',
    myStreams: '📺 Mis Transmisiones',
    enterStreamTitle: '🎤 Ingresa un título para tu transmisión:',
    streamCreated: '✅ ¡Tu transmisión está lista!\\n\\n🔗 *Enlace:* {link}\\n\\n¡Comparte este enlace con tu audiencia!',
    activeStreams: '🎤 *Transmisiones Activas* ({count})',
    noActiveStreams: '😔 No hay transmisiones activas ahora. ¡Sé el primero en transmitir!',
    joinStream: '▶️ Unirse',
    endStream: '⏹️ Finalizar',
    streamEnded: '✅ Transmisión finalizada exitosamente.',
    viewerCount: '👁️ {count} espectadores',

    // Radio
    radioIntro: '📻 *PNPtv Radio*\\n\\n¡Tu estación de música 24/7!',
    listenNow: '▶️ Escuchar Ahora',
    requestSong: '🎵 Solicitar Canción',
    nowPlaying: '🎵 Sonando: {song}',
    radioSchedule: '📅 Programación',
    songRequestPrompt: '🎵 ¿Qué canción te gustaría escuchar?',
    songRequestAdded: '✅ ¡Tu solicitud ha sido agregada a la cola!',
    radioPlaying: '▶️ ¡Disfruta PNPtv Radio!',

    // Zoom Rooms
    zoomRoomsIntro: '🎥 *Salas Zoom*\\n\\nCrea o únete a videollamadas:',
    createRoom: '➕ Crear Nueva Sala',
    joinRoom: '▶️ Unirse a Sala',
    myRooms: '📋 Mis Salas',
    enterRoomName: '🎥 Ingresa un nombre para tu sala:',
    roomPrivacy: 'Privacidad de la sala:',
    roomPublic: '🌐 Pública',
    roomPrivate: '🔒 Privada',
    roomCreated: '✅ ¡Sala creada!\\n\\n🔗 *Enlace:* {link}\\n\\n💡 Comparte este enlace para invitar participantes.',
    activeRooms: '🎥 *Salas Activas* ({count})',
    noActiveRooms: '😔 No hay salas activas. ¡Crea una ahora!',
    roomJoined: '✅ Uniéndose a la sala...',

    // Admin Panel
    adminPanel: '👨‍💼 *Panel de Administración*\\n\\nSelecciona una acción:',
    adminBroadcast: '📢 Difundir Mensaje',
    adminUsers: '👥 Gestión de Usuarios',
    adminPlans: '💎 Gestionar Planes',
    adminAnalytics: '📊 Analíticas',
    broadcastWizard: '📢 *Asistente de Difusión*\\n\\nPaso 1: Selecciona audiencia',
    broadcastAllUsers: '👥 Todos los Usuarios',
    broadcastPremiumOnly: '💎 Solo Usuarios Premium',
    broadcastFreeOnly: '🆓 Solo Usuarios Gratis',
    broadcastByLanguage: '🌐 Por Idioma',
    broadcastEnglish: '🇺🇸 Usuarios en Inglés',
    broadcastSpanish: '🇪🇸 Usuarios en Español',
    broadcastMessagePrompt: '📝 Ingresa tu mensaje de difusión (texto, foto o video):',
    broadcastConfirm: '📢 ¿Enviar a {count} usuarios?',
    broadcastSent: '✅ ¡Difusión enviada a {count} usuarios!',
    broadcastCancelled: '❌ Difusión cancelada.',
    userSearch: '🔍 Ingresa ID de usuario o nombre de usuario para buscar:',
    userNotFound: '❌ Usuario no encontrado.',
    userActions: '👤 *Usuario: @{username}*\\n\\nSelecciona acción:',
    extendSubscription: '⏰ Extender Suscripción',
    deactivateUser: '🚫 Desactivar Usuario',
    activateUser: '✅ Activar Usuario',
    userUpdated: '✅ Usuario actualizado exitosamente.',

    // Support
    supportIntro: '🤖 *Centro de Soporte*\\n\\n¿Cómo podemos ayudarte?',
    chatWithAI: '🤖 Chatear con Cristina (IA)',
    contactAdmin: '👨‍💼 Contactar Admin',
    faq: '❓ FAQ',
    aiChatActive: '🤖 *Asistente IA Cristina*\\n\\n¡Pregúntame lo que quieras! Escribe /menu para volver al menú principal.',
    contactAdminPrompt: '👨‍💼 Por favor describe tu problema y un admin te contactará pronto:',
    supportTicketCreated: '✅ ¡Ticket de soporte creado! Nuestro equipo te contactará pronto.',

    // Settings
    settingsIntro: '⚙️ *Configuración*\\n\\nConfigura tus preferencias:',
    changeLanguage: '🌐 Cambiar Idioma',
    privacySettings: '🔒 Configuración de Privacidad',
    notificationSettings: '🔔 Notificaciones',
    languageChanged: '✅ Idioma cambiado a Español.',
    privacyIntro: '🔒 *Configuración de Privacidad*',
    showProfile: 'Mostrar mi perfil en búsqueda cercana',
    showOnline: 'Mostrar cuando estoy en línea',
    allowMessages: 'Permitir mensajes de desconocidos',
    settingsSaved: '✅ ¡Configuración guardada!',

    // Membership Notifications
    membershipActivated: '✅ Membresía Activada',
    congratulations: 'Felicitaciones',
    yourPlan: 'Tu Plan',
    tier: 'Nivel',
    expiresOn: 'Expira El',
    yourFeatures: 'Tus Características',
    yourInviteCode: 'Tu Código de Invitación',
    shareInviteCode: '¡Comparte este código con amigos para darles acceso!',
    expirationWarning: 'Membresía Por Expirar',
    yourMembership: 'Tu Membresía',
    expiresIn: 'expira en',
    days: 'días',
    expiryDate: 'Fecha de Expiración',
    renewNowMessage: '💡 ¡Renueva ahora para mantener tu acceso premium!',
    renewNow: '🔄 Renovar Ahora',
    dismiss: '❌ Descartar',
    finalReminder: 'Recordatorio Final',
    afterExpirationMessage: 'Después de la expiración, serás degradado al nivel Gratis.',
    renewNowToKeepAccess: '🔄 ¡Renueva ahora para mantener tu acceso premium sin interrupciones!',
    membershipExpired: 'Membresía Expirada',
    yourMembershipHasExpired: 'Tu membresía ha expirado y has sido degradado al nivel Gratis.',
    previousTier: 'Nivel Anterior',
    currentTier: 'Nivel Actual',
    renewToReactivate: '¡Renueva tu membresía para reactivar características premium!',
    inviteLinkGenerated: 'Enlace de Invitación Generado',
    inviteLink: 'Enlace de Invitación',
    maxUses: 'Usos Máximos',
    shareWithFriends: '¡Comparte este enlace con amigos!',
    shareLink: 'Compartir Enlace',
    backToMenu: 'Volver al Menú',
    inviteUsed: 'Código de Invitación Usado',
    newUserJoined: 'Un nuevo usuario se unió usando tu código de invitación',
    thankYouForSharing: '¡Gracias por compartir PNPtv!',

    // Errors
    unauthorized: '⛔ No autorizado. Este comando es solo para administradores.',
    notSubscribed: '⚠️ Esta característica requiere una suscripción PRIME.',
    locationRequired: '📍 Por favor comparte tu ubicación primero en tu perfil.',
    invalidInput: '❌ Entrada inválida. Por favor intenta de nuevo.',
    serverError: '❌ Error del servidor. Nuestro equipo ha sido notificado.',
    maintenanceMode: '🔧 Bot en mantenimiento. Por favor intenta más tarde.',
  },
};

/**
 * Initialize i18next
 */
await i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: translations.en },
    es: { translation: translations.es },
  },
  interpolation: {
    escapeValue: false,
  },
});

/**
 * Translation function with variable replacement
 */
export function t(key, lang = 'en', variables = {}) {
  return i18next.t(key, { lng: lang, ...variables });
}

/**
 * Get user's language from context or default to English
 */
export function getUserLanguage(ctx) {
  return ctx.session?.language || ctx.from?.language_code?.split('-')[0] || 'en';
}

/**
 * Set user's language
 */
export function setUserLanguage(ctx, lang) {
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.language = ['en', 'es'].includes(lang) ? lang : 'en';
  return ctx.session.language;
}

export default {
  t,
  getUserLanguage,
  setUserLanguage,
};
