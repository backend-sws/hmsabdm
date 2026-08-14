<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')->where('email', 'superadmin@hms.com')->whereNull('username')->update(['username' => 'superadmin']);
        DB::table('users')->where('email', 'superadmin@company.com')->whereNull('username')->update(['username' => 'company_admin']);
        DB::table('users')->where('email', 'admin@demo.com')->whereNull('username')->update(['username' => 'admin']);
        DB::table('users')->where('email', 'reception@demo.com')->whereNull('username')->update(['username' => 'reception']);

        // For any remaining users with null username, generate from email or name
        $users = DB::table('users')->whereNull('username')->get();
        foreach ($users as $user) {
            $base = $user->email ? explode('@', $user->email)[0] : 'user' . $user->id;
            $username = $base;
            $counter = 1;
            while (DB::table('users')->where('username', $username)->where('id', '!=', $user->id)->exists()) {
                $username = $base . $counter;
                $counter++;
            }
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
