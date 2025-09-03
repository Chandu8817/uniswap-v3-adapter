# Uniswap V3 Adapter Frontend

This is the frontend interface for interacting with the Uniswap V3 Adapter smart contract. It provides a user-friendly way to swap tokens and manage liquidity positions on Uniswap V3.

## Features

- Connect with MetaMask wallet
- Swap tokens with real-time price quotes
- Add/Remove liquidity to Uniswap V3 pools
- Support for multiple fee tiers (0.05%, 0.3%, 1%)
- Responsive design that works on desktop and mobile
- Dark mode support

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MetaMask browser extension

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env` file in the project root and add the following variables:

```
VITE_APP_INFURA_ID=your_infura_id
VITE_APP_ALCHEMY_KEY=your_alchemy_key
VITE_APP_UNISWAP_V3_ADAPTER_ADDRESS=your_contract_address
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## Project Structure

```
src/
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── App.tsx          # Main application component
└── main.tsx         # Application entry point
```

## Smart Contract Integration

This frontend integrates with the Uniswap V3 Adapter smart contract. Make sure you have deployed the contract and updated the contract address in the environment variables.

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

MIT

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
