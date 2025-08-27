import type { Meta, StoryObj } from '@storybook/react-vite';
import Typography from '../components/atoms/Typography';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'h1',
        'h2',
        'h3',
        'h4',
        'body',
        'bodyLarge',
        'bodySmall',
        'caption',
        'label',
      ],
    },
    color: {
      control: { type: 'select' },
      options: [
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'default',
        'muted',
      ],
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right', 'justify'],
    },
    weight: {
      control: { type: 'select' },
      options: ['normal', 'medium', 'semibold', 'bold'],
    },
    transform: {
      control: { type: 'select' },
      options: ['uppercase', 'lowercase', 'capitalize', 'none'],
    },
    decoration: {
      control: { type: 'select' },
      options: ['underline', 'lineThrough', 'none'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 타이포그래피
export const Default: Story = {
  args: {
    variant: 'body',
    children: 'This is default typography text',
  },
};

// 제목 계층
export const Headings: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="h1">Heading 1 - Main Title</Typography>
      <Typography variant="h2">Heading 2 - Section Title</Typography>
      <Typography variant="h3">Heading 3 - Subsection Title</Typography>
      <Typography variant="h4">Heading 4 - Minor Title</Typography>
    </div>
  ),
};

// 본문 텍스트
export const BodyText: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="bodyLarge">
        Body Large - Important content
      </Typography>
      <Typography variant="body">Body - Regular content</Typography>
      <Typography variant="bodySmall">
        Body Small - Secondary content
      </Typography>
      <Typography variant="caption">
        Caption - Small explanatory text
      </Typography>
      <Typography variant="label">Label - Form field labels</Typography>
    </div>
  ),
};

// 색상 변형
export const Colors: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="body" color="primary">
        Primary Color Text
      </Typography>
      <Typography variant="body" color="secondary">
        Secondary Color Text
      </Typography>
      <Typography variant="body" color="success">
        Success Color Text
      </Typography>
      <Typography variant="body" color="warning">
        Warning Color Text
      </Typography>
      <Typography variant="body" color="danger">
        Danger Color Text
      </Typography>
      <Typography variant="body" color="default">
        Default Color Text
      </Typography>
      <Typography variant="body" color="muted">
        Muted Color Text
      </Typography>
    </div>
  ),
};

// 정렬
export const Alignment: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
    >
      <Typography variant="body" align="left">
        Left Aligned Text
      </Typography>
      <Typography variant="body" align="center">
        Center Aligned Text
      </Typography>
      <Typography variant="body" align="right">
        Right Aligned Text
      </Typography>
      <Typography variant="body" align="justify">
        Justified Text - This text is justified to fill the entire width of the
        container, creating even left and right margins.
      </Typography>
    </div>
  ),
};

// 폰트 굵기
export const FontWeights: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="body" weight="normal">
        Normal Weight Text
      </Typography>
      <Typography variant="body" weight="medium">
        Medium Weight Text
      </Typography>
      <Typography variant="body" weight="semibold">
        Semibold Weight Text
      </Typography>
      <Typography variant="body" weight="bold">
        Bold Weight Text
      </Typography>
    </div>
  ),
};

// 텍스트 변환
export const TextTransforms: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="body" transform="none">
        No Transform Text
      </Typography>
      <Typography variant="body" transform="uppercase">
        Uppercase Text
      </Typography>
      <Typography variant="body" transform="lowercase">
        Lowercase Text
      </Typography>
      <Typography variant="body" transform="capitalize">
        Capitalize Text
      </Typography>
    </div>
  ),
};

// 텍스트 장식
export const TextDecorations: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Typography variant="body" decoration="none">
        No Decoration Text
      </Typography>
      <Typography variant="body" decoration="underline">
        Underlined Text
      </Typography>
      <Typography variant="body" decoration="lineThrough">
        Line Through Text
      </Typography>
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        alignItems: 'flex-start',
      }}
    >
      <Typography
        variant="h1"
        color="primary"
        align="center"
        weight="bold"
        transform="uppercase"
        decoration="underline"
      >
        Main Page Title
      </Typography>

      <Typography variant="h2" color="secondary" align="left" weight="semibold">
        Section Header
      </Typography>

      <Typography
        variant="bodyLarge"
        color="success"
        align="justify"
        weight="medium"
      >
        This is a success message with larger body text that demonstrates how
        the typography component handles longer content with justified alignment
        and medium font weight.
      </Typography>

      <Typography
        variant="caption"
        color="warning"
        align="center"
        weight="normal"
        transform="capitalize"
      >
        important notice
      </Typography>

      <Typography
        variant="label"
        color="danger"
        align="left"
        weight="bold"
        decoration="lineThrough"
      >
        Deprecated Field
      </Typography>
    </div>
  ),
};
