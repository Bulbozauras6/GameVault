<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserAccountApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_authenticated_user_can_view_their_profile_without_sensitive_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/user')->assertOk();

        $this->assertSame([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ], $response->json('data'));
        $response->assertJsonMissingPath('data.password');
        $response->assertJsonMissingPath('data.remember_token');
    }

    public function test_authenticated_user_can_update_their_name_and_email(): void
    {
        $user = User::factory()->create();
        $passwordHash = $user->password;

        $this->actingAs($user)
            ->putJson('/api/user', [
                'name' => 'Updated Player',
                'email' => 'updated-player@example.test',
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.name', 'Updated Player')
            ->assertJsonPath('data.email', 'updated-player@example.test')
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Player',
            'email' => 'updated-player@example.test',
        ]);
        $this->assertSame($passwordHash, $user->refresh()->password);
    }

    public function test_authenticated_user_can_keep_their_own_email_address(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/user', [
                'name' => 'Renamed Player',
                'email' => $user->email,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed Player')
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_profile_update_rejects_an_email_owned_by_another_user(): void
    {
        $user = User::factory()->create(['name' => 'Original Player']);
        $otherUser = User::factory()->create(['email' => 'taken@example.test']);

        $this->actingAs($user)
            ->putJson('/api/user', [
                'name' => 'Changed Player',
                'email' => $otherUser->email,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Original Player',
            'email' => $user->email,
        ]);
    }

    public function test_authenticated_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => 'current-password-123']);
        $oldPasswordHash = $user->password;

        $this->actingAs($user)
            ->putJson('/api/user/password', [
                'current_password' => 'current-password-123',
                'password' => 'new-password-456',
                'password_confirmation' => 'new-password-456',
            ])
            ->assertOk()
            ->assertJsonPath('data', null)
            ->assertJsonPath('message', 'Password updated successfully.')
            ->assertJsonMissingPath('password');

        $updatedUser = $user->refresh();
        $this->assertNotSame($oldPasswordHash, $updatedUser->password);
        $this->assertTrue(Hash::check('new-password-456', $updatedUser->password));
    }

    public function test_password_change_rejects_an_incorrect_current_password(): void
    {
        $user = User::factory()->create(['password' => 'current-password-123']);
        $oldPasswordHash = $user->password;

        $this->actingAs($user)
            ->putJson('/api/user/password', [
                'current_password' => 'incorrect-password',
                'password' => 'new-password-456',
                'password_confirmation' => 'new-password-456',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);

        $this->assertSame($oldPasswordHash, $user->refresh()->password);
    }

    public function test_password_change_rejects_a_mismatched_confirmation(): void
    {
        $user = User::factory()->create(['password' => 'current-password-123']);
        $oldPasswordHash = $user->password;

        $this->actingAs($user)
            ->putJson('/api/user/password', [
                'current_password' => 'current-password-123',
                'password' => 'new-password-456',
                'password_confirmation' => 'different-password-789',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertSame($oldPasswordHash, $user->refresh()->password);
    }

    public function test_guest_receives_401_when_updating_a_profile(): void
    {
        $this->putJson('/api/user', [
            'name' => 'Unauthenticated Player',
            'email' => 'guest@example.test',
        ])->assertUnauthorized();
    }

    public function test_guest_receives_401_when_changing_a_password(): void
    {
        $this->putJson('/api/user/password', [
            'current_password' => 'current-password-123',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ])->assertUnauthorized();
    }
}
