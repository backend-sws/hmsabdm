<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OperationTheatre;

class OperationTheatreSeeder extends Seeder
{
    public function run(): void
    {
        $theatres = [
            ['name' => 'Main OT 1 - General, GI & Laparoscopic', 'code' => 'OT-01', 'floor' => '2nd Floor, Wing A', 'status' => 'available'],
            ['name' => 'Super-Specialty OT 2 - Ortho & Joint Replacement', 'code' => 'OT-02', 'floor' => '2nd Floor, Wing A', 'status' => 'available'],
            ['name' => 'Maternity & Gynae OT 3 (Obstetrics)', 'code' => 'OT-03', 'floor' => '2nd Floor, Wing B', 'status' => 'available'],
            ['name' => 'Day Care & Minor OT', 'code' => 'OT-04', 'floor' => 'Ground Floor', 'status' => 'available'],
        ];

        foreach ([26] as $hospitalId) {
            foreach ($theatres as $t) {
                OperationTheatre::firstOrCreate(
                    ['hospital_id' => $hospitalId, 'code' => $t['code']],
                    array_merge($t, ['hospital_id' => $hospitalId, 'is_active' => true])
                );
            }
        }
    }
}
