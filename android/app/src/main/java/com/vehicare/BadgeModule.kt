package com.vehicare

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class BadgeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        activeReactContext = reactContext
    }

    companion object {
        const val MODULE_NAME = "VehiCareBadge"
        const val CHANNEL_ID = "vehicare_notifications_channel_v3"
        const val CHANNEL_NAME = "VehiCare Push Notifications"
        const val NOTIFICATION_ID = 1001
        const val EVENT_PUSH_CLICKED = "vehicarePushNotificationClicked"

        const val EXTRA_FROM_PUSH = "from_push_notification"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
        const val EXTRA_NOTIFICATION_TITLE = "notification_title"
        const val EXTRA_NOTIFICATION_MESSAGE = "notification_message"
        const val EXTRA_NOTIFICATION_TYPE = "notification_type"

        private const val PREFS_NAME = "VehiCareNotificationPrefs"
        private const val KEY_LAST_ALERTED_COUNT = "last_alerted_count"
        private const val KEY_LAST_ALERTED_NOTIF_ID = "last_alerted_notif_id"
        private const val KEY_LAST_ALERTED_HAS_CONTENT = "last_alerted_has_content"

        @Volatile
        private var staticLastAlertedCount: Int = -1

        @Volatile
        private var staticLastAlertedNotifId: String? = null

        @Volatile
        private var staticLastAlertedHasContent: Boolean = false

        @Volatile
        private var activeReactContext: ReactApplicationContext? = null

        @Volatile
        private var pendingOpenedNotification: Map<String, String?>? = null

        fun handleNotificationIntent(intent: Intent?) {
            if (intent == null) return
            val isFromPush = intent.getBooleanExtra(EXTRA_FROM_PUSH, false)
            if (!isFromPush) return

            val notifId = intent.getStringExtra(EXTRA_NOTIFICATION_ID)
            val notifTitle = intent.getStringExtra(EXTRA_NOTIFICATION_TITLE)
            val notifMessage = intent.getStringExtra(EXTRA_NOTIFICATION_MESSAGE)
            val notifType = intent.getStringExtra(EXTRA_NOTIFICATION_TYPE)

            intent.removeExtra(EXTRA_FROM_PUSH)

            val payload = mapOf(
                "id" to notifId,
                "title" to notifTitle,
                "message" to notifMessage,
                "type" to notifType
            )
            pendingOpenedNotification = payload

            try {
                val ctx = activeReactContext
                if (ctx != null && ctx.hasActiveReactInstance()) {
                    val map = Arguments.createMap().apply {
                        putString("id", notifId)
                        putString("title", notifTitle)
                        putString("message", notifMessage)
                        putString("type", notifType)
                    }
                    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(EVENT_PUSH_CLICKED, map)
                }
            } catch (_: Exception) {
                // JS listener will pick up pendingOpenedNotification via consumeOpenedNotification
            }
        }
    }

    override fun getName(): String = MODULE_NAME

    private fun getPersistedAlertedCount(): Int {
        if (staticLastAlertedCount >= 0) {
            return staticLastAlertedCount
        }
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val count = prefs.getInt(KEY_LAST_ALERTED_COUNT, 0)
        staticLastAlertedCount = count
        return count
    }

    private fun getPersistedAlertedNotifId(): String? {
        if (staticLastAlertedNotifId != null) {
            return staticLastAlertedNotifId
        }
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val id = prefs.getString(KEY_LAST_ALERTED_NOTIF_ID, null)
        staticLastAlertedNotifId = id
        return id
    }

    private fun getPersistedAlertedHasContent(): Boolean {
        if (staticLastAlertedHasContent) {
            return true
        }
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hasContent = prefs.getBoolean(KEY_LAST_ALERTED_HAS_CONTENT, false)
        staticLastAlertedHasContent = hasContent
        return hasContent
    }

    private fun setPersistedAlertedCount(count: Int) {
        val safe = if (count < 0) 0 else count
        staticLastAlertedCount = safe
        if (safe == 0) {
            staticLastAlertedNotifId = null
            staticLastAlertedHasContent = false
        }
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit().putInt(KEY_LAST_ALERTED_COUNT, safe)
        if (safe == 0) {
            editor.remove(KEY_LAST_ALERTED_NOTIF_ID)
            editor.putBoolean(KEY_LAST_ALERTED_HAS_CONTENT, false)
        }
        editor.apply()
    }

    private fun setPersistedAlertedState(count: Int, notifId: String?, hasContent: Boolean) {
        val safe = if (count < 0) 0 else count
        staticLastAlertedCount = safe
        staticLastAlertedNotifId = notifId
        staticLastAlertedHasContent = hasContent
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
            .putInt(KEY_LAST_ALERTED_COUNT, safe)
            .putBoolean(KEY_LAST_ALERTED_HAS_CONTENT, hasContent)
        if (!notifId.isNullOrBlank()) {
            editor.putString(KEY_LAST_ALERTED_NOTIF_ID, notifId)
        }
        editor.apply()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "VehiCare alerts, announcements, and maintenance reminders"
                setShowBadge(true)
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun showPushNotification(
        count: Int,
        customTitle: String?,
        customMessage: String?,
        notificationId: String?,
        notificationType: String?,
        promise: Promise
    ) {
        try {
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (count <= 0) {
                setPersistedAlertedCount(0)
                notificationManager.cancel(NOTIFICATION_ID)
                promise.resolve(true)
                return
            }

            val persisted = getPersistedAlertedCount()
            val persistedNotifId = getPersistedAlertedNotifId()
            val persistedHasContent = getPersistedAlertedHasContent()
            val hasCustomContent = !customTitle.isNullOrBlank() || !customMessage.isNullOrBlank()
            val isNewNotifId = !notificationId.isNullOrBlank() && notificationId != persistedNotifId
            val isContentUpgrade = hasCustomContent && !persistedHasContent

            // If count has not increased, notification ID has not changed, and we aren't upgrading
            // a generic badge count notification with its actual title/content, do not re-alert.
            if (count <= persisted && !isNewNotifId && !isContentUpgrade) {
                promise.resolve(true)
                return
            }

            // Record updated state
            setPersistedAlertedState(
                count,
                if (!notificationId.isNullOrBlank()) notificationId else persistedNotifId,
                hasCustomContent || persistedHasContent
            )

            createNotificationChannel()

            val displayTitle = if (!customTitle.isNullOrBlank()) customTitle else "VehiCare"
            val displayMessage = if (!customMessage.isNullOrBlank()) {
                customMessage
            } else {
                if (count == 1) "You have 1 new notification" else "You have $count new notifications"
            }

            val intent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_FROM_PUSH, true)
                if (!notificationId.isNullOrBlank()) putExtra(EXTRA_NOTIFICATION_ID, notificationId)
                putExtra(EXTRA_NOTIFICATION_TITLE, displayTitle)
                putExtra(EXTRA_NOTIFICATION_MESSAGE, displayMessage)
                if (!notificationType.isNullOrBlank()) putExtra(EXTRA_NOTIFICATION_TYPE, notificationType)
            }

            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getActivity(reactContext, 0, intent, flags)

            val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(displayTitle)
                .setContentText(displayMessage)
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .setBigContentTitle(displayTitle)
                        .bigText(displayMessage)
                )
                .setNumber(count)
                .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)

            if (isContentUpgrade && count <= persisted && !isNewNotifId) {
                builder.setSilent(true)
            }

            if (count > 1 && !customMessage.isNullOrBlank()) {
                builder.setSubText("$count unread notifications")
            }

            notificationManager.notify(NOTIFICATION_ID, builder.build())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BADGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setBadgeCount(count: Int, promise: Promise) {
        showPushNotification(count, null, null, null, null, promise)
    }

    @ReactMethod
    fun setBadgeWithNotification(
        count: Int,
        title: String?,
        message: String?,
        notificationId: String?,
        notificationType: String?,
        promise: Promise
    ) {
        showPushNotification(count, title, message, notificationId, notificationType, promise)
    }

    @ReactMethod
    fun consumeOpenedNotification(promise: Promise) {
        val pending = pendingOpenedNotification
        pendingOpenedNotification = null
        if (pending == null) {
            promise.resolve(null)
            return
        }
        val map = Arguments.createMap().apply {
            putString("id", pending["id"])
            putString("title", pending["title"])
            putString("message", pending["message"])
            putString("type", pending["type"])
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        try {
            val clipboard = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("VehiCare Message", text)
            clipboard.setPrimaryClip(clip)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearBadge(promise: Promise) {
        setPersistedAlertedCount(0)
        setBadgeCount(0, promise)
    }
}
