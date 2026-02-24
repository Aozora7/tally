import { TextInput, Select, Button, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { CategoryType, TransactionCategory } from '@/types';

export interface TransactionFilterState {
  searchText: string;
  dateFrom: string;
  dateTo: string;
  categoryType: CategoryType | null;
  categoryId: string | null;
}

interface TransactionFilterBarProps {
  filter: TransactionFilterState;
  onFilterChange: (filter: TransactionFilterState) => void;
  categories: TransactionCategory[];
}

const CATEGORY_TYPES: CategoryType[] = ['Income', 'Fixed', 'Cyclical', 'Irregular'];

export function TransactionFilterBar({
  filter,
  onFilterChange,
  categories,
}: TransactionFilterBarProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, searchText: e.target.value });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, dateFrom: e.target.value });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, dateTo: e.target.value });
  };

  const handleCategoryTypeClick = (type: CategoryType) => {
    onFilterChange({
      ...filter,
      categoryType: filter.categoryType === type ? null : type,
    });
  };

  const handleCategoryChange = (value: string | null) => {
    onFilterChange({ ...filter, categoryId: value === '' ? null : value });
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Group gap="sm" wrap="wrap">
      <TextInput
        placeholder="Search..."
        leftSection={<IconSearch size={16} />}
        value={filter.searchText}
        onChange={handleSearchChange}
        style={{ minWidth: 200 }}
      />
      <TextInput
        placeholder="Date From"
        value={filter.dateFrom}
        onChange={handleDateFromChange}
        style={{ minWidth: 120 }}
      />
      <TextInput
        placeholder="Date To"
        value={filter.dateTo}
        onChange={handleDateToChange}
        style={{ minWidth: 120 }}
      />
      <Button.Group>
        {CATEGORY_TYPES.map((type) => (
          <Button
            key={type}
            variant={filter.categoryType === type ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleCategoryTypeClick(type)}
          >
            {type}
          </Button>
        ))}
      </Button.Group>
      <Select
        placeholder="Category"
        data={categoryOptions}
        value={filter.categoryId ?? ''}
        onChange={handleCategoryChange}
        clearable
        style={{ minWidth: 150 }}
      />
    </Group>
  );
}
