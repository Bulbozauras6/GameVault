<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1');
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'add']);
    Route::put('/cart/items/{item}', [CartController::class, 'update'])->whereNumber('item');
    Route::delete('/cart/items/{item}', [CartController::class, 'remove'])->whereNumber('item');
    Route::post('/checkout', [CheckoutController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show'])->whereNumber('order');
});

Route::get('/health', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'GameVault API is working!',
    ]);
});

Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/platforms', [CatalogController::class, 'platforms']);
Route::get('/regions', [CatalogController::class, 'regions']);
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{slug}', [CatalogController::class, 'show']);
Route::get('/home', HomeController::class);
