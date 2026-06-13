import type { Product, Category } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: 'Todos', icon: 'Grid', company_id: '' },
  { id: 'casquinhas', name: 'Casquinhas', icon: 'Cone', company_id: '' },
  { id: 'milkshakes', name: 'Milkshakes', icon: 'CupSoda', company_id: '' },
  { id: 'sundaes', name: 'Sundaes & Taças', icon: 'Dessert', company_id: '' },
  { id: 'bebidas', name: 'Bebidas', icon: 'Beer', company_id: '' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    company_id: '',
    name: 'Casquinha Baunilha',
    price: 6.50,
    category: 'casquinhas',
    color: '#FFF4D4',
    description: 'Casquinha crocante com sorvete cremoso de baunilha.'
  },
  {
    id: '2',
    company_id: '',
    name: 'Casquinha Chocolate',
    price: 6.50,
    category: 'casquinhas',
    color: '#E2C4B1',
    description: 'Casquinha crocante com sorvete cremoso de chocolate belga.'
  },
  {
    id: '3',
    company_id: '',
    name: 'Casquinha Mista',
    price: 7.00,
    category: 'casquinhas',
    color: '#F4E3D3',
    description: 'Casquinha crocante misturando baunilha e chocolate.'
  },
  {
    id: '4',
    company_id: '',
    name: 'Cascão Trufado',
    price: 12.00,
    category: 'casquinhas',
    color: '#D8BCA3',
    description: 'Cascão crocante com borda trufada de chocolate e sorvete a escolha.'
  },
  {
    id: '5',
    company_id: '',
    name: 'Milkshake Ovomaltine 500ml',
    price: 16.90,
    category: 'milkshakes',
    color: '#E6D3C3',
    description: 'Milkshake cremoso de chocolate com flocos crocantes de Ovomaltine.'
  },
  {
    id: '6',
    company_id: '',
    name: 'Milkshake Morango 500ml',
    price: 15.90,
    category: 'milkshakes',
    color: '#FFD1DC',
    description: 'Milkshake feito com sorvete de morango e calda artesanal.'
  },
  {
    id: '7',
    company_id: '',
    name: 'Milkshake Ninho com Nutella',
    price: 18.90,
    category: 'milkshakes',
    color: '#FFF0F5',
    description: 'Milkshake de leite Ninho mesclado com muita Nutella original.'
  },
  {
    id: '8',
    company_id: '',
    name: 'Sundae Morango',
    price: 13.50,
    category: 'sundaes',
    color: '#FFC0CB',
    description: 'Taça de sorvete de baunilha, calda quente de morango e castanhas.'
  },
  {
    id: '9',
    company_id: '',
    name: 'Sundae Chocolate',
    price: 13.50,
    category: 'sundaes',
    color: '#D2B48C',
    description: 'Taça de sorvete de chocolate, calda quente de chocolate e wafer.'
  },
  {
    id: '10',
    company_id: '',
    name: 'Banana Split',
    price: 22.00,
    category: 'sundaes',
    color: '#FFF8DC',
    description: 'Clássica banana split com 3 bolas de sorvete, caldas e chantilly.'
  },
  {
    id: '11',
    company_id: '',
    name: 'Água Mineral 500ml',
    price: 4.00,
    category: 'bebidas',
    color: '#E0F7FA',
    description: 'Água mineral sem gás bem gelada.'
  },
  {
    id: '12',
    company_id: '',
    name: 'Refrigerante Lata',
    price: 6.00,
    category: 'bebidas',
    color: '#FFCDD2',
    description: 'Coca-Cola, Guaraná Antarctica ou Sprite em lata.'
  }
];

