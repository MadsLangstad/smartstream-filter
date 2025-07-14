#!/bin/bash

echo "🚀 Setting up Stripe test environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test price IDs that work with Stripe test mode
BASIC_PRICE="price_1O4bSL2eZvKYlo2CRdQkpHPG"
PRO_PRICE="price_1O4bT52eZvKYlo2CdGPIeBEn"
LIFETIME_PRICE="price_1O4bTm2eZvKYlo2C6AWdd6Go"

# Update extension .env.local
echo -e "${BLUE}Updating extension configuration...${NC}"
cat > .env.local << EOF
VITE_API_URL=http://localhost:3000/api/v1

# Stripe Test Price IDs
VITE_STRIPE_PRICE_ID_BASIC=${BASIC_PRICE}
VITE_STRIPE_PRICE_ID_PRO=${PRO_PRICE}
VITE_STRIPE_PRICE_ID_LIFETIME=${LIFETIME_PRICE}
EOF

# Update server .env
echo -e "${BLUE}Updating server configuration...${NC}"
cd ../smartstream-filter-stripe-server

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Add price IDs to server .env
echo "" >> .env
echo "# Stripe Test Price IDs" >> .env
echo "STRIPE_PRICE_BASIC_MONTHLY=${BASIC_PRICE}" >> .env
echo "STRIPE_PRICE_PRO_MONTHLY=${PRO_PRICE}" >> .env
echo "STRIPE_PRICE_LIFETIME=${LIFETIME_PRICE}" >> .env

# Build extension
echo -e "${BLUE}Building extension...${NC}"
cd ../smartstream-filter
npm run build

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Add your Stripe secret key to server/.env:"
echo "   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE"
echo ""
echo "2. Start the server:"
echo "   cd ../smartstream-filter-stripe-server"
echo "   npm start"
echo ""
echo "3. Reload the extension in Chrome"
echo ""
echo "4. Test with Stripe test card: 4242 4242 4242 4242"