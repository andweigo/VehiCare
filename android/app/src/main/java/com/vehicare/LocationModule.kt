package com.vehicare

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class LocationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "VehiCareLocation"
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun isLocationEnabled(promise: Promise) {
        try {
            val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager == null) {
                promise.resolve(false)
                return
            }
            val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            promise.resolve(isGpsEnabled || isNetworkEnabled)
        } catch (e: Exception) {
            promise.reject("LOCATION_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openLocationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentLocation(options: ReadableMap?, promise: Promise) {
        try {
            val fineCheck = ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
            val coarseCheck = ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )

            if (fineCheck != PackageManager.PERMISSION_GRANTED && coarseCheck != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "Location permissions (FINE or COARSE) are not granted.")
                return
            }

            val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager == null) {
                promise.reject("SERVICE_UNAVAILABLE", "Location manager is not available on this device.")
                return
            }

            val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

            if (!isGpsEnabled && !isNetworkEnabled) {
                promise.reject("LOCATION_SERVICES_DISABLED", "Location services are turned off. Please enable device GPS.")
                return
            }

            val timeoutMs = if (options != null && options.hasKey("timeout")) {
                options.getInt("timeout").toLong()
            } else {
                8000L
            }

            var bestLocation: Location? = null

            // 1. Check last known location
            val gpsLast = if (isGpsEnabled) locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) else null
            val netLast = if (isNetworkEnabled) locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) else null

            if (gpsLast != null && netLast != null) {
                bestLocation = if (gpsLast.time >= netLast.time) gpsLast else netLast
            } else if (gpsLast != null) {
                bestLocation = gpsLast
            } else if (netLast != null) {
                bestLocation = netLast
            }

            val now = System.currentTimeMillis()
            // If last known location is very fresh (< 15 seconds) and has decent accuracy (< 50m), return immediately
            if (bestLocation != null && (now - bestLocation.time) < 15000L && bestLocation.accuracy <= 50f) {
                val result = Arguments.createMap().apply {
                    putDouble("latitude", bestLocation.latitude)
                    putDouble("longitude", bestLocation.longitude)
                    putDouble("accuracy", bestLocation.accuracy.toDouble())
                    putDouble("timestamp", bestLocation.time.toDouble())
                    putString("provider", bestLocation.provider ?: "fused")
                }
                promise.resolve(result)
                return
            }

            val mainHandler = Handler(Looper.getMainLooper())
            var isResolved = false

            val listener = object : LocationListener {
                override fun onLocationChanged(loc: Location) {
                    if (isResolved) return
                    isResolved = true
                    try {
                        locationManager.removeUpdates(this)
                    } catch (e: Exception) {}

                    val result = Arguments.createMap().apply {
                        putDouble("latitude", loc.latitude)
                        putDouble("longitude", loc.longitude)
                        putDouble("accuracy", loc.accuracy.toDouble())
                        putDouble("timestamp", loc.time.toDouble())
                        putString("provider", loc.provider ?: "gps")
                    }
                    promise.resolve(result)
                }

                @Deprecated("Deprecated in Java")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }

            val timeoutRunnable = Runnable {
                if (isResolved) return@Runnable
                isResolved = true
                try {
                    locationManager.removeUpdates(listener)
                } catch (e: Exception) {}

                if (bestLocation != null) {
                    val result = Arguments.createMap().apply {
                        putDouble("latitude", bestLocation.latitude)
                        putDouble("longitude", bestLocation.longitude)
                        putDouble("accuracy", bestLocation.accuracy.toDouble())
                        putDouble("timestamp", bestLocation.time.toDouble())
                        putString("provider", bestLocation.provider ?: "cached")
                    }
                    promise.resolve(result)
                } else {
                    promise.reject("LOCATION_TIMEOUT", "Timed out waiting for GPS location fix.")
                }
            }

            mainHandler.postDelayed(timeoutRunnable, timeoutMs)

            // Request updates on main thread
            mainHandler.post {
                try {
                    if (isGpsEnabled) {
                        locationManager.requestLocationUpdates(
                            LocationManager.GPS_PROVIDER,
                            1000L,
                            1.0f,
                            listener,
                            Looper.getMainLooper()
                        )
                    }
                    if (isNetworkEnabled) {
                        locationManager.requestLocationUpdates(
                            LocationManager.NETWORK_PROVIDER,
                            1000L,
                            1.0f,
                            listener,
                            Looper.getMainLooper()
                        )
                    }
                } catch (e: SecurityException) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!isResolved) {
                        isResolved = true
                        promise.reject("SECURITY_EXCEPTION", e.message, e)
                    }
                } catch (e: Exception) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!isResolved) {
                        isResolved = true
                        if (bestLocation != null) {
                            val result = Arguments.createMap().apply {
                                putDouble("latitude", bestLocation.latitude)
                                putDouble("longitude", bestLocation.longitude)
                                putDouble("accuracy", bestLocation.accuracy.toDouble())
                                putDouble("timestamp", bestLocation.time.toDouble())
                                putString("provider", bestLocation.provider ?: "cached")
                            }
                            promise.resolve(result)
                        } else {
                            promise.reject("LOCATION_ERROR", e.message, e)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject("LOCATION_ERROR", e.message, e)
        }
    }
}
