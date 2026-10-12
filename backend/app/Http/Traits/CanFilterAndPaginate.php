<?php

namespace App\Http\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

trait CanFilterAndPaginate
{
    /**
     * Apply pagination or return all records based on request query parameters.
     *
     * Supports:
     * - ?all=true / ?all=1 (Returns collection for dropdowns / form selects)
     * - ?paginate=false (Returns collection)
     * - ?per_page=-1 (Returns collection)
     * - ?per_page=N & ?page=N (Returns paginated results)
     *
    /**
     * @param Builder|\Spatie\QueryBuilder\QueryBuilder|\Illuminate\Database\Query\Builder $query
     * @param Request|array|null $request
     * @param int $defaultPerPage
     * @return LengthAwarePaginator|Collection
     */
    public function applyPaginationOrAll($query, Request|array|null $request = null, int $defaultPerPage = 15)
    {
        $req = $request instanceof Request ? $request : request();
        
        $wantsAll = false;
        if ($req) {
            $all = $req->query('all');
            $paginate = $req->query('paginate');
            $perPage = $req->query('per_page');

            if ($all === 'true' || $all === '1' || $all === true ||
                $paginate === 'false' || $paginate === '0' || $paginate === false ||
                $perPage === '-1' || $perPage === -1) {
                $wantsAll = true;
            }
        }

        if ($wantsAll) {
            return $query->get();
        }

        $perPage = $req && $req->has('per_page') ? (int) $req->query('per_page') : $defaultPerPage;
        if ($perPage <= 0) {
            $perPage = $defaultPerPage;
        }

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * Get case-insensitive like operator based on active database driver (pgsql uses ilike, sqlite/mysql use like).
     */
    public function likeOperator(): string
    {
        return \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
    }
}
