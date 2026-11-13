<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category' => ['sometimes', 'nullable', 'string', 'exists:categories,slug'],
            'platform' => ['sometimes', 'nullable', 'string', 'exists:platforms,slug'],
            'region' => ['sometimes', 'nullable', 'string', 'exists:regions,code'],
            'min_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'max_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99', 'gte:min_price'],
            'sort' => ['sometimes', 'nullable', 'string', 'in:relevance,price_asc,price_desc,title_asc,title_desc,newest'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }
}
