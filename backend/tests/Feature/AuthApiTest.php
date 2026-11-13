<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Origin', 'http://localhost:5173');
        $this->withHeader('Referer', 'http://localhost:5173/');
    }

    public function test_registration_creates_a_hashed_user_and_authenticates_the_session(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Demo Player',
            'email' => 'demo-player@example.test',
            'password' => 'secure-pass-123',
            'password_confirmation' => 'secure-pass-123',
        ])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'name', 'email']])
            ->assertJsonPath('data.name', 'Demo Player')
            ->assertJsonMissingPath('data.password');

        $user = User::query()->where('email', 'demo-player@example.test')->firstOrFail();

        $this->assertTrue(Hash::check('secure-pass-123', $user->password));
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_type' => User::class,
            'tokenable_id' => $user->id,
        ]);
        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_registration_validates_required_fields_confirmation_and_unique_email(): void
    {
        $existing = User::factory()->create(['email' => 'existing@example.test']);

        $this->postJson('/api/register', [
            'name' => '',
            'email' => $existing->email,
            'password' => 'short',
            'password_confirmation' => 'not-the-same',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_login_logout_and_authenticated_user_use_the_session_guard(): void
    {
        $user = User::factory()->create([
            'email' => 'player@example.test',
            'password' => 'correct-horse-battery',
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'correct-horse-battery',
        ])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('data.name', $user->name);

        $this->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->assertGuest('web');
    }

    public function test_current_user_endpoint_rejects_unauthenticated_requests(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_returns_validation_error_for_invalid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'player@example.test']);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'incorrect-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertGuest('web');
    }
}
