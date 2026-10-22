package com.vehicare

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BadgeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var lastReportedCount: Int = -1

    companion object {
        const val MODULE_NAME = "VehiCareBadge"
        const val CHANNEL_ID = "vehicare_notifications_channel_v3"
        const val CHANNEL_NAME = "VehiCare Push Notifications"
        const val NOTIFICATION_ID = 1001
    }

    override fun getName(): String = MODULE_NAME

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

    @ReactMethod
    fun setBadgeCount(count: Int, promise: Promise) {
        try {
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (count <= 0) {
                lastReportedCount = 0
                notificationManager.cancel(NOTIFICATION_ID)
                promise.resolve(true)
                return
            }

            if (count == lastReportedCount) {
                promise.resolve(true)
                return
            }
            lastReportedCount = count

            createNotificationChannel()

            val intent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getActivity(reactContext, 0, intent, flags)

            val title = "VehiCare"
            val message = if (count == 1) "You have 1 new notification" else "You have $count new notifications"

            val notification = NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setNumber(count)
                .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            notificationManager.notify(NOTIFICATION_ID, notification)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BADGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearBadge(promise: Promise) {
        lastReportedCount = 0
        setBadgeCount(0, promise)
    }
}
