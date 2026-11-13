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
                'short_description' => 'Carve out a life in Night City as V, a mercenary caught between corporate power and the city’s street-level hustle.',
                'description' => 'Night City is a sprawling metropolis where corporations, gangs, and ambitious fixers compete for influence. You play V, a mercenary whose attempt to secure a rare piece of technology goes badly wrong, leaving them searching for a way to survive. Explore the city in first person, take on main jobs and optional gigs, and approach encounters with weapons, stealth, hacking, or a mix of all three. Cyberware and skill choices let you shape V into a precise netrunner, a close-range fighter, or something between. Conversations and decisions affect relationships and the course of the story, while the dense streets, districts, and characters give the open world its distinct, high-pressure atmosphere.',
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
                'short_description' => 'Ride with an outlaw gang through the last years of the American frontier.',
                'description' => 'In 1899, outlaw Arthur Morgan and the Van der Linde gang are trying to stay together as lawmen and a changing country close in. The story follows Arthur’s loyalties and doubts, with the gang’s camp serving as a home that changes as events unfold. Beyond missions, travel on horseback through towns, mountains, forests, and plains; hunt wildlife, fish, gather supplies, and meet people with their own troubles. Gunfights use deliberate aiming and cover, while an honor system reflects Arthur’s conduct. The measured pace, detailed world, and attention to everyday camp routines make exploration feel different from simply moving between objectives.',
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
                'short_description' => 'Switch between three protagonists as their ambitions collide in Los Santos.',
                'description' => 'Los Santos is the setting for three overlapping stories: Michael, a retired criminal pulled back toward risk; Franklin, a young hustler looking for a way forward; and Trevor, an unpredictable former associate. The single-player campaign moves between them, using character switches to change perspective during missions and heists. Driving, shooting, flight, and planning all play a part, but the city is also open for unscripted exploration, side activities, and encounters. Its satirical take on celebrity, money, and modern American life gives the story a sharp tone, while the contrast among the protagonists keeps missions varied. The surrounding countryside adds a very different pace from the busy streets.',
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
                'short_description' => 'Roam the Lands Between, uncover the shattered order, and build a Tarnished hero to suit your approach.',
                'description' => 'The Elden Ring has been shattered, and the Lands Between are divided among powerful demigods. As a Tarnished, explore this interconnected fantasy realm in search of Great Runes and a path toward becoming Elden Lord. Open fields, hidden caves, and elaborate legacy dungeons reward curiosity, while the story is pieced together through characters, item details, and environmental clues. Combat is deliberate: study enemy patterns, manage stamina, and choose from a wide range of weapons, spells, skills, and spirit summons. Character building is flexible, so players can favor strength, dexterity, magic, or combinations. Its distinctive balance of discovery and demanding boss encounters lets you seek another route or return with a new strategy.',
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
                'short_description' => 'Begin as a late-arriving Hogwarts student and investigate a mysterious form of ancient magic.',
                'description' => 'Set in the 1800s, Hogwarts Legacy follows a student who joins the school as a fifth-year and discovers an unusual connection to ancient magic. Attend lessons, learn spells, and explore familiar halls as well as Hogsmeade and the surrounding Highlands. Combat combines spell timing, dodges, defensive charms, and tools such as potions and magical plants; outside fights, you can solve environmental puzzles, care for magical creatures, and improve your equipment. A central mystery leads beyond the castle, while optional activities let you spend time with classmates and develop your character. The setting is designed around the experience of exploring a wizarding school and its wider world in a different era.',
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
                'short_description' => 'Turn a block-built world into a home, a challenge, or a creation limited only by your plans.',
                'description' => 'Minecraft has no fixed campaign: each world is a collection of landscapes to explore and materials to put to use. In Survival mode, gather resources, craft better tools, build shelter, and manage threats as you venture farther from home. Creative mode removes those survival pressures and provides broad building freedom, while multiplayer lets friends share a world and projects. Mining and crafting form the basic loop, but systems such as farming, enchanting, redstone circuits, and exploration add layers for players who want them. The simple blocks support very different goals, from a modest base to elaborate machines and architecture. Its open-ended structure makes the player’s own plan the reason to keep playing.',
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
                'short_description' => 'Build a party, confront a mind-flayer threat, and let difficult choices shape your journey.',
                'description' => 'After surviving an encounter with mind flayers, a group of unlikely companions searches for a way to remove the parasite implanted in their minds. Create a hero or choose an origin character, then travel through the Forgotten Realms with companions whose goals and reactions develop alongside the story. Exploration blends dialogue, investigation, environmental interactions, and decisions that can open or close entire paths. When conflicts turn to combat, the game uses turn-based encounters based on Dungeons & Dragons fifth-edition rules, with movement, actions, spells, terrain, and party composition all mattering. Multiple solutions to many situations make experimentation worthwhile, and choices can change alliances, relationships, and the fate of people you meet.',
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
                'short_description' => 'Hunt monsters as Geralt while searching a war-torn continent for Ciri.',
                'description' => 'Geralt of Rivia is a witcher: a trained monster hunter navigating a continent torn by war and superstition. His search for Ciri, a person close to him, carries him through regions with distinct communities, politics, and dangers. Investigate clues before taking contracts, prepare with oils and potions, and combine swordplay with witcher signs in combat. The world is full of optional stories, from local disputes to strange creature encounters, and choices often have consequences that emerge later rather than immediately. Between major quests, ride through forests, villages, and cities, follow notice-board work, or explore at your own pace. The mix of personal character drama and smaller, self-contained tales gives the adventure much of its identity.',
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
                'short_description' => 'Trade city life for a neglected farm and build a place in the close-knit town of Pelican Town.',
                'description' => 'After inheriting a neglected farm from your grandfather, you leave city life behind and settle near Pelican Town. Clear the land, plant seasonal crops, raise animals, and decide how to spend each day with limited time and energy. Farming is only one part of the routine: fish, gather, craft, and explore mines filled with resources and monsters. The townspeople have schedules, friendships, and personal stories that develop as you get to know them, while festivals mark the changing seasons. Progress is flexible rather than built around a strict ending, so you can focus on a profitable farm, community relationships, exploration, or a little of everything. Its calm rhythm makes small improvements feel rewarding.',
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
                'short_description' => 'Coordinate a four-player squad, call in support, and fight to complete objectives on hostile worlds.',
                'description' => 'As a Helldiver serving Super Earth, deploy with up to three other players to complete objectives on hostile planets. Missions range from activating equipment to holding ground or destroying enemy targets, and the squad must decide how much time to spend on optional tasks before extraction. A defining mechanic is the stratagem system: enter directional inputs to call in weapons, supplies, turrets, vehicles, and powerful strikes. Support can turn a fight around, but poor placement can hurt teammates; friendly fire is always a factor. Enemy pressure, limited reinforcements, and changing mission conditions encourage communication and quick adjustments. The result is cooperative shooting where teamwork and occasional chaos are both central to the experience.',
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
                'short_description' => 'Travel with Kratos and Atreus through the Nine Realms as their family faces an approaching war.',
                'description' => 'Fimbulwinter has arrived, and Kratos and Atreus set out across the Nine Realms while trying to understand what the coming conflict will mean for their family. Their journey combines close-quarters combat with exploration, environmental puzzles, and conversations with allies from Norse myth. Kratos can fight with the Leviathan Axe, Blades of Chaos, and other tools, switching weapons and abilities to answer different threats; Atreus also contributes in combat and has parts of the story that follow his perspective. New regions introduce their own hazards, routes, and challenges. The game’s distinctive focus is the changing relationship between father and son, set against large mythic stakes and a cinematic adventure.',
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
                'short_description' => 'Build a garage and race across a broad, changing map inspired by Mexico’s landscapes.',
                'description' => 'Forza Horizon 5 centers on the Horizon Festival, an open-world celebration of driving set across a fictionalized Mexico. The map moves from coastal roads and dense jungle to desert, farmland, and mountain terrain, giving different cars and driving styles room to shine. Take part in circuit and point-to-point races, off-road events, stunt challenges, and festival expeditions, or simply explore and discover new activities. A large vehicle collection can be tuned and customized, while seasonal conditions and weather alter the feel of routes over time. Progress is open-ended: completing events unlocks more opportunities rather than forcing one fixed path. Its appeal comes from accessible handling, varied scenery, and the freedom to choose what to drive next.',
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
