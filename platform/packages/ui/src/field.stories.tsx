import { auth, onboarding } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Field, Select, TextArea } from './field';

function Form() {
  return (
    <form className="flex max-w-md flex-col gap-6">
      <Field label={auth.emailLabel} type="email" placeholder={auth.emailPlaceholder} />
      <Field
        label={auth.codeLabel}
        inputMode="numeric"
        error={auth.invalidCode}
        defaultValue="123"
      />
      <Field label={onboarding.firstNameLabel} disabled defaultValue="Niall" />
      <TextArea label="Notes" hint="Only you see these." />
      <Select
        label="Season"
        placeholder="Choose one"
        options={[
          { value: 'spring', label: 'Spring' },
          { value: 'summer', label: 'Summer' },
          { value: 'autumn', label: 'Autumn' },
          { value: 'winter', label: 'Winter' },
        ]}
      />
    </form>
  );
}

const meta = { title: 'Primitives/Field', component: Form } satisfies Meta<typeof Form>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
