<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\HomepageSection;
use App\Models\HomepageSectionItem;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Platform;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Region;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MarketplaceDemoSeeder extends Seeder
{
    private const AVAILABLE_KEYS_PER_OFFER = 10;

    public function run(): void
    {
        DB::transaction(function (): void {
            $categories = $this->seedCategories();
            $platforms = $this->seedPlatforms();
            $regions = $this->seedRegions();
            $sellers = $this->seedSellers();
            $products = $this->seedProducts($categories, $platforms, $regions, $sellers);

            $this->seedHomepageSections($products);
            $this->seedBestSellerOrders($products);
        });
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        $definitions = [
            'action' => ['Action', 'Fast-paced adventures and combat-focused games.'],
            'adventure' => ['Adventure', 'Story-rich journeys and exploration.'],
            'open-world' => ['Open World', 'Large worlds built for exploration.'],
            'role-playing' => ['Role-Playing', 'Character-driven role-playing games.'],
            'survival' => ['Survival', 'Crafting, survival, and sandbox experiences.'],
            'shooter' => ['Shooter', 'First-person and cooperative action games.'],
            'simulation' => ['Simulation', 'Creative and simulation games.'],
            'racing' => ['Racing', 'Driving and motorsport games.'],
        ];

        $categories = [];

        foreach ($definitions as $slug => [$name, $description]) {
            $categories[$slug] = Category::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'description' => $description, 'is_active' => true],
            );
        }

        return $categories;
    }

    /**
     * @return array<string, Platform>
     */
    private function seedPlatforms(): array
    {
        $definitions = [
            'pc' => 'PC',
            'steam' => 'Steam',
            'playstation-5' => 'PlayStation 5',
            'xbox-series-xs' => 'Xbox Series X|S',
            'nintendo-switch' => 'Nintendo Switch',
        ];

        $platforms = [];

        foreach ($definitions as $slug => $name) {
            $platforms[$slug] = Platform::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name],
            );
        }

        return $platforms;
    }

    /**
     * @return array<string, Region>
     */
    private function seedRegions(): array
    {
        $definitions = [
            'GLOBAL' => 'Global',
            'EU' => 'Europe',
            'NA' => 'North America',
            'LATAM' => 'Latin America',
        ];

        $regions = [];

        foreach ($definitions as $code => $name) {
            $regions[$code] = Region::query()->updateOrCreate(
                ['code' => $code],
                ['name' => $name],
            );
        }

        return $regions;
    }

    /**
     * @return array<string, Seller>
     */
    private function seedSellers(): array
    {
        $definitions = [
            'vault-demo' => 'Vault Demo Store',
            'pixel-harbor-demo' => 'Pixel Harbor Demo',
            'keynest-demo' => 'KeyNest Demo',
            'northstar-demo' => 'Northstar Games Demo',
        ];

        $sellers = [];

        foreach ($definitions as $slug => $name) {
            $sellers[$slug] = Seller::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'status' => 'active'],
            );
        }

        return $sellers;
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Platform>  $platforms
     * @param  array<string, Region>  $regions
     * @param  array<string, Seller>  $sellers
     * @return array<string, Product>
     */
    private function seedProducts(array $categories, array $platforms, array $regions, array $sellers): array
    {
        $products = [];

        foreach ($this->productDefinitions() as $definition) {
            $product = Product::query()->updateOrCreate(
                ['slug' => $definition['slug']],
                [
                    'title' => $definition['title'],
                    'short_description' => $definition['short_description'],
                    'description' => $definition['description'],
                    'developer' => $definition['developer'],
                    'publisher' => $definition['publisher'],
                    'release_date' => $definition['release_date'],
                    'status' => 'active',
                ],
            );

            $product->categories()->sync(collect($definition['categories'])->map(
                fn (string $slug): int => $categories[$slug]->id,
            )->all());
            $product->platforms()->sync(collect($definition['platforms'])->map(
                fn (string $slug): int => $platforms[$slug]->id,
            )->all());
            $product->regions()->sync(array_map(
                fn (Region $region): int => $region->id,
                array_values($regions),
            ));

            ProductImage::query()
                ->where('product_id', $product->id)
                ->update(['is_primary' => false]);

            ProductImage::query()->updateOrCreate(
                ['product_id' => $product->id, 'sort_order' => 0],
                [
                    'image_url' => $definition['image_url'],
                    'alt_text' => $definition['title'].' cover art',
                    'is_primary' => true,
                ],
            );

            $productPlatforms = $definition['platforms'];
            $offerDefinitions = [
                [
                    'seller' => 'vault-demo',
                    'platform' => $productPlatforms[0],
                    'region' => 'GLOBAL',
                    'price' => $definition['prices'][0],
                ],
                [
                    'seller' => 'pixel-harbor-demo',
                    'platform' => $productPlatforms[1],
                    'region' => 'EU',
                    'price' => $definition['prices'][1],
                ],
                [
                    'seller' => 'keynest-demo',
                    'platform' => $productPlatforms[count($productPlatforms) - 1],
                    'region' => 'NA',
                    'price' => $definition['prices'][2],
                ],
            ];

            foreach ($offerDefinitions as $offerDefinition) {
                $offer = Offer::query()->updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'seller_id' => $sellers[$offerDefinition['seller']]->id,
                        'platform_id' => $platforms[$offerDefinition['platform']]->id,
                        'region_id' => $regions[$offerDefinition['region']]->id,
                    ],
                    [
                        'price' => $offerDefinition['price'],
                        'compare_at_price' => $definition['compare_at_price'],
                        'currency' => 'USD',
                        'status' => 'active',
                        'starts_at' => null,
                        'ends_at' => null,
                    ],
                );

                if ($offer->status === 'active') {
                    $this->seedAvailableKeys($offer);
                }
            }

            $products[$definition['slug']] = $product;
        }

        return $products;
    }

    private function seedAvailableKeys(Offer $offer): void
    {
        $lockedOffer = Offer::query()
            ->whereKey($offer->id)
            ->lockForUpdate()
            ->firstOrFail();
        $availableCount = $lockedOffer->digitalKeys()
            ->where('status', 'available')
            ->count();

        for ($index = $availableCount; $index < self::AVAILABLE_KEYS_PER_OFFER; $index++) {
            $key = 'GV-DEMO-'.$lockedOffer->id.'-'.Str::upper(Str::uuid()->toString());

            DigitalKey::query()->create([
                'offer_id' => $lockedOffer->id,
                'encrypted_key' => $key,
                'key_fingerprint' => hash('sha256', $key),
                'status' => 'available',
            ]);
        }
    }

    /**
     * @param  array<string, Product>  $products
     */
    private function seedHomepageSections(array $products): void
    {
        $definitions = [
            'main-banner' => [
                'title' => 'Featured on GameVault',
                'type' => 'banner',
                'sort_order' => 1,
                'limit' => 1,
                'products' => ['cyberpunk-2077'],
            ],
            'featured-games' => [
                'title' => 'Featured Games',
                'type' => 'curated',
                'sort_order' => 2,
                'limit' => 10,
                'products' => [
                    'cyberpunk-2077',
                    'red-dead-redemption-2',
                    'grand-theft-auto-v',
                    'elden-ring',
                    'hogwarts-legacy',
                    'minecraft',
                    'baldurs-gate-3',
                    'the-witcher-3-wild-hunt',
                    'stardew-valley',
                    'helldivers-2',
                ],
            ],
            'best-sellers' => [
                'title' => 'Best Sellers',
                'type' => 'best_sellers',
                'sort_order' => 3,
                'limit' => 10,
                'products' => [],
            ],
            'deals' => [
                'title' => 'Deals worth a look',
                'type' => 'deals',
                'sort_order' => 4,
                'limit' => 10,
                'products' => [],
            ],
        ];

        foreach ($definitions as $key => $definition) {
            $section = HomepageSection::query()->updateOrCreate(
                ['section_key' => $key],
                [
                    'title' => $definition['title'],
                    'section_type' => $definition['type'],
                    'is_active' => true,
                    'sort_order' => $definition['sort_order'],
                    'settings' => ['limit' => $definition['limit']],
                    'starts_at' => null,
                    'ends_at' => null,
                ],
            );

            $sortOrders = [];

            foreach ($definition['products'] as $index => $slug) {
                $sortOrder = $index + 1;
                $sortOrders[] = $sortOrder;

                HomepageSectionItem::query()->updateOrCreate(
                    ['section_id' => $section->id, 'sort_order' => $sortOrder],
                    ['product_id' => $products[$slug]->id, 'offer_id' => null],
                );
            }

            $items = HomepageSectionItem::query()->where('section_id', $section->id);

            if ($sortOrders === []) {
                $items->delete();
            } else {
                $items->whereNotIn('sort_order', $sortOrders)->delete();
            }
        }
    }

    /**
     * Add simulated purchase history to exercise the existing 30-day best-seller view.
     *
     * @param  array<string, Product>  $products
     */
    private function seedBestSellerOrders(array $products): void
    {
        $buyer = User::query()->firstOrCreate(
            ['email' => 'gamevault-demo-buyer@example.test'],
            [
                'name' => 'GameVault Demo Buyer',
                'password' => Hash::make(Str::random(48)),
            ],
        );

        $purchases = [
            ['slug' => 'minecraft', 'quantity' => 5, 'days_ago' => 2],
            ['slug' => 'elden-ring', 'quantity' => 4, 'days_ago' => 4],
            ['slug' => 'cyberpunk-2077', 'quantity' => 3, 'days_ago' => 7],
            ['slug' => 'grand-theft-auto-v', 'quantity' => 3, 'days_ago' => 10],
            ['slug' => 'red-dead-redemption-2', 'quantity' => 2, 'days_ago' => 14],
            ['slug' => 'hogwarts-legacy', 'quantity' => 2, 'days_ago' => 18],
        ];

        foreach ($purchases as $index => $purchase) {
            $product = $products[$purchase['slug']];
            $offer = $product->offers()->orderBy('price')->firstOrFail();
            $placedAt = now()->subDays($purchase['days_ago']);
            $orderNumber = $this->demoUuid('order-'.$index);
            $unitPrice = (float) $offer->price;
            $lineTotal = number_format($unitPrice * $purchase['quantity'], 2, '.', '');

            $order = Order::query()->firstOrCreate(
                ['order_number' => $orderNumber],
                [
                    'user_id' => $buyer->id,
                    'status' => 'completed',
                    'payment_method' => 'simulated',
                    'payment_reference' => $this->demoUuid('payment-reference-'.$index),
                    'currency' => $offer->currency,
                    'subtotal' => $lineTotal,
                    'total' => $lineTotal,
                    'placed_at' => $placedAt,
                ],
            );

            OrderItem::query()->firstOrCreate(
                ['order_id' => $order->id, 'offer_id' => $offer->id],
                [
                    'product_id' => $product->id,
                    'seller_id' => $offer->seller_id,
                    'quantity' => $purchase['quantity'],
                    'unit_price' => $offer->price,
                    'line_total' => $lineTotal,
                    'currency' => $offer->currency,
                    'product_title_snapshot' => $product->title,
                    'seller_name_snapshot' => $offer->seller->name,
                    'platform_name_snapshot' => $offer->platform->name,
                    'region_name_snapshot' => $offer->region->name,
                ],
            );
        }
    }

    private function demoUuid(string $key): string
    {
        $hash = md5('gamevault-demo-'.$key);
        $hash[12] = '5';
        $hash[16] = 'a';

        return substr($hash, 0, 8).'-'
            .substr($hash, 8, 4).'-'
            .substr($hash, 12, 4).'-'
            .substr($hash, 16, 4).'-'
            .substr($hash, 20, 12);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function productDefinitions(): array
    {
        return [
            [
                'slug' => 'cyberpunk-2077',
                'title' => 'Cyberpunk 2077',
                'short_description' => 'Build your own mercenary legend in the neon-lit streets of Night City.',
                'description' => 'Step into Night City as V, a mercenary making a name in a world shaped by powerful corporations and street-level crews. Take on jobs across a sprawling city, develop a playstyle that suits you, and make choices as you pursue a future on your own terms.',
                'developer' => 'CD PROJEKT RED',
                'publisher' => 'CD PROJEKT RED',
                'release_date' => '2020-12-10',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_600x900.jpg',
                'categories' => ['action', 'open-world', 'role-playing'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs'],
                'prices' => ['22.49', '25.99', '28.49'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'red-dead-redemption-2',
                'title' => 'Red Dead Redemption 2',
                'short_description' => 'Ride through a changing frontier in a story-rich western adventure.',
                'description' => 'Travel across a vast frontier as Arthur Morgan, an outlaw facing the end of the gang’s way of life. Follow a cinematic story, take on missions, and explore towns and wilderness at your own pace, with hunting and countless encounters along the way.',
                'developer' => 'Rockstar Games',
                'publisher' => 'Rockstar Games',
                'release_date' => '2019-12-05',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/library_600x900.jpg',
                'categories' => ['action', 'adventure', 'open-world'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs'],
                'prices' => ['18.99', '21.49', '24.99'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'grand-theft-auto-v',
                'title' => 'Grand Theft Auto V',
                'short_description' => 'Follow three very different lives through the open world of Los Santos.',
                'description' => 'Explore Los Santos through the intersecting stories of Michael, Franklin, and Trevor. Switch between the three protagonists, take on high-stakes missions and heists, or leave the story behind to discover the city and its surrounding countryside.',
                'developer' => 'Rockstar North',
                'publisher' => 'Rockstar Games',
                'release_date' => '2015-04-14',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/271590/library_600x900.jpg',
                'categories' => ['action', 'open-world'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs'],
                'prices' => ['14.99', '17.49', '19.99'],
                'compare_at_price' => '29.99',
            ],
            [
                'slug' => 'elden-ring',
                'title' => 'Elden Ring',
                'short_description' => 'Explore a vast fantasy realm and overcome formidable foes your way.',
                'description' => 'Create a Tarnished warrior and set out across the Lands Between, a world of hidden paths, ancient ruins, and formidable enemies. Experiment with weapons, abilities, and magic as you build your character and choose how to face its demanding battles.',
                'developer' => 'FromSoftware',
                'publisher' => 'Bandai Namco Entertainment',
                'release_date' => '2022-02-25',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_600x900.jpg',
                'categories' => ['action', 'adventure', 'role-playing'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs'],
                'prices' => ['39.99', '44.99', '49.99'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'hogwarts-legacy',
                'title' => 'Hogwarts Legacy',
                'short_description' => 'Attend Hogwarts and uncover a magical adventure of your own.',
                'description' => 'Create a student at Hogwarts in the 1800s, learn spells, and explore the castle and the wider wizarding world. Develop your magical skills, meet fellow students, and follow an original adventure filled with discoveries and choices.',
                'developer' => 'Avalanche Software',
                'publisher' => 'Warner Bros. Games',
                'release_date' => '2023-02-10',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/990080/library_600x900.jpg',
                'categories' => ['action', 'adventure', 'role-playing'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs', 'nintendo-switch'],
                'prices' => ['29.99', '34.99', '39.99'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'minecraft',
                'title' => 'Minecraft',
                'short_description' => 'Gather, craft, and build anything you can imagine in a block-based world.',
                'description' => 'Shape a world made of blocks: gather materials, craft tools, and build anything from a simple shelter to a sprawling creation. Explore new landscapes, take on survival challenges, or use creative mode to focus on building and experimentation.',
                'developer' => 'Mojang Studios',
                'publisher' => 'Xbox Game Studios',
                'release_date' => '2011-11-18',
                'image_url' => 'https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.webp',
                'categories' => ['adventure', 'survival', 'simulation'],
                'platforms' => ['pc', 'playstation-5', 'xbox-series-xs', 'nintendo-switch'],
                'prices' => ['19.99', '22.49', '26.99'],
                'compare_at_price' => '29.99',
            ],
            [
                'slug' => 'baldurs-gate-3',
                'title' => 'Baldur’s Gate 3',
                'short_description' => 'Gather a party and shape a branching fantasy adventure through your choices.',
                'description' => 'Create a hero, assemble a party of memorable companions, and travel through a fantasy story shaped by your decisions. Explore, solve problems in different ways, and take on tactical, turn-based battles inspired by the rules of Dungeons & Dragons.',
                'developer' => 'Larian Studios',
                'publisher' => 'Larian Studios',
                'release_date' => '2023-08-03',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/library_600x900.jpg',
                'categories' => ['adventure', 'role-playing'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs'],
                'prices' => ['49.99', '54.99', '58.99'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'the-witcher-3-wild-hunt',
                'title' => 'The Witcher 3: Wild Hunt',
                'short_description' => 'Track monsters and follow Geralt’s search across a richly detailed fantasy world.',
                'description' => 'Play as Geralt of Rivia, a professional monster hunter searching for Ciri across a dangerous, war-torn world. Take contracts, explore villages and wild places, and make difficult choices as personal stories and larger conflicts unfold around you.',
                'developer' => 'CD PROJEKT RED',
                'publisher' => 'CD PROJEKT RED',
                'release_date' => '2015-05-18',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/292030/library_600x900.jpg',
                'categories' => ['action', 'adventure', 'open-world', 'role-playing'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs', 'nintendo-switch'],
                'prices' => ['12.99', '15.49', '18.99'],
                'compare_at_price' => '39.99',
            ],
            [
                'slug' => 'stardew-valley',
                'title' => 'Stardew Valley',
                'short_description' => 'Restore a country farm, grow your community, and settle into valley life.',
                'description' => 'Turn an overgrown farm into a home by planting crops, raising animals, and choosing what to build next. Get to know the people in town, explore the nearby caves, and enjoy a relaxed routine that changes with the seasons.',
                'developer' => 'ConcernedApe',
                'publisher' => 'ConcernedApe',
                'release_date' => '2016-02-26',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/413150/library_600x900.jpg',
                'categories' => ['adventure', 'role-playing', 'simulation'],
                'platforms' => ['steam', 'playstation-5', 'xbox-series-xs', 'nintendo-switch'],
                'prices' => ['9.99', '11.49', '13.49'],
                'compare_at_price' => '14.99',
            ],
            [
                'slug' => 'helldivers-2',
                'title' => 'HELLDIVERS 2',
                'short_description' => 'Team up for chaotic co-op missions on hostile planets across the galaxy.',
                'description' => 'Join a squad of Helldivers and carry out cooperative missions on dangerous planets. Coordinate weapons and support gear, call in powerful stratagems, and watch your squad’s fire as you fight through unpredictable battles for Super Earth.',
                'developer' => 'Arrowhead Game Studios',
                'publisher' => 'PlayStation Publishing LLC',
                'release_date' => '2024-02-08',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/553850/library_600x900.jpg',
                'categories' => ['action', 'shooter'],
                'platforms' => ['steam', 'playstation-5'],
                'prices' => ['29.99', '34.99', '37.99'],
                'compare_at_price' => '39.99',
            ],
            [
                'slug' => 'god-of-war-ragnarok',
                'title' => 'God of War Ragnarök',
                'short_description' => 'Join Kratos and Atreus on a new journey across the Nine Realms.',
                'description' => 'Continue Kratos and Atreus’s journey through the realms of Norse mythology as they face a looming conflict and questions about the future. Explore varied lands, solve environmental challenges, and combine weapons and abilities in fast-paced combat.',
                'developer' => 'Santa Monica Studio',
                'publisher' => 'PlayStation Publishing LLC',
                'release_date' => '2024-09-19',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/2322010/library_600x900.jpg',
                'categories' => ['action', 'adventure'],
                'platforms' => ['steam', 'playstation-5'],
                'prices' => ['39.99', '44.99', '49.99'],
                'compare_at_price' => '59.99',
            ],
            [
                'slug' => 'forza-horizon-5',
                'title' => 'Forza Horizon 5',
                'short_description' => 'Race through Mexico’s varied landscapes in a vibrant open-world driving festival.',
                'description' => 'Explore an expansive Mexico, from city streets and jungles to deserts and mountain roads, in a festival built around cars and competition. Take on races and changing events, discover new routes, and collect and customize vehicles to suit your driving style.',
                'developer' => 'Playground Games',
                'publisher' => 'Xbox Game Studios',
                'release_date' => '2021-11-09',
                'image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1551360/library_600x900.jpg',
                'categories' => ['open-world', 'racing', 'simulation'],
                'platforms' => ['steam', 'xbox-series-xs'],
                'prices' => ['29.99', '34.99', '39.99'],
                'compare_at_price' => '59.99',
            ],
        ];
    }
}
