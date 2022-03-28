import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const addProduct = async (productId: number) => {
    try {
      var product = cart.find((product) => product.id === productId);

      if (product) {

        updateProductAmount({ productId, amount: product.amount + 1 });

        return;

      }

      const { data } = await api.get<Product>(`products/${productId}`);

      product = data;
      product.amount = 1;

      if ((await isProductAvaiable({ productId, amount: product.amount })) === false) {
        return;
      }

      const updatedCart = [...cart, product];

      setCart(updatedCart);

      setCartInLocalStorage(updatedCart);

      return;
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productIndex = cart.findIndex((product) => product.id === productId);

      if (productIndex === -1) {
        throw new Error();
      }

      cart.splice(productIndex, 1);


      setCart([...cart]);
      setCartInLocalStorage([...cart]);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      if ((await isProductAvaiable({ productId, amount })) === false) {
        return;
      }

      let updatedCart = [...cart];
      updatedCart.find((product) => product.id === productId)!.amount = amount;

      setCart(updatedCart);
      setCartInLocalStorage(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const isProductAvaiable = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    const { data } = await api.get<Stock>(`stock/${productId}`);
    const productStock = data;

    if (amount > productStock.amount) {
      toast.error("Quantidade solicitada fora de estoque");
      return false;
    }

    return true;
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

function setCartInLocalStorage(updatedCart: Product[]) {
  localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
}

export function useCart(): CartContextData {
  return useContext(CartContext);
}
