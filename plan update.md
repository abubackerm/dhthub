This error is a standard NestJS dependency injection issue. The message is telling you exactly what is wrong:

Nest can't resolve dependencies of EnquiryService
Missing dependency: CartRepository

Meaning:

Your EnquiryService constructor has:

constructor(
  private eventEmitter: EventEmitter2,
  private enquiryRepository: EnquiryRepository,
  private enquiryItemRepository: EnquiryItemRepository,
  private cartRepository: CartRepository,   // <- PROBLEM
  private variantRepository: ProductVariantRepository,
  private productRepository: ProductRepository,
)

But NestJS cannot find CartRepository inside EnquiryModule.

Fix (Most Likely)

You must export CartRepository from CartModule.

apps/api/src/modules/cart/cart.module.ts
@Module({
  imports: [
    EventEmitterModule,
    forwardRef(() => CatalogModule),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartItemRepository,
  ],
  exports: [
    CartService,
    CartRepository,   // ✅ ADD THIS
  ],
})
export class CartModule {}
Then Import CartModule in EnquiryModule
apps/api/src/modules/enquiry/enquiry.module.ts
@Module({
  imports: [
    forwardRef(() => CartModule),   // ✅ IMPORTANT
    CatalogModule,
    EventEmitterModule,
  ],
  controllers: [EnquiryController],
  providers: [
    EnquiryService,
    EnquiryRepository,
    EnquiryItemRepository,
  ],
})
export class EnquiryModule {}
Why forwardRef()?

Because later your system may have:

Cart → Enquiry
Enquiry → Cart

Which creates a circular dependency.

forwardRef() prevents NestJS from crashing.

If You Still Get Error

Then ensure CartRepository is not missing from providers.

Check:

cart.module.ts
providers: [
  CartService,
  CartRepository,
  CartItemRepository
]
After Fix

Restart server:

pnpm dev

or

pnpm start:dev
Expected Dependency Graph

After fix:

CartModule
   └ CartRepository
        ↓ exported

EnquiryModule
   └ imports CartModule
        ↓
   EnquiryService can use CartRepository
Small Architecture Tip

Your current dependency:

EnquiryService
   ├ CartRepository
   ├ ProductVariantRepository
   └ ProductRepository

is perfectly fine for:

createFromCart()

because the service must:

load cart
copy cart items
create enquiry