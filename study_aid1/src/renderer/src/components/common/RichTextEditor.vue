<template>
  <div class="rich-text-editor">
    <!-- Toolbar -->
    <div v-if="editor && editable" class="editor-toolbar">
      <div class="toolbar-group">
        <el-button
          :type="editor.isActive('bold') ? 'primary' : ''"
          size="small"
          :icon="'Bold'"
          @click="editor.chain().focus().toggleBold().run()"
          title="粗体"
        />
        <el-button
          :type="editor.isActive('italic') ? 'primary' : ''"
          size="small"
          :icon="'Italic'"
          @click="editor.chain().focus().toggleItalic().run()"
          title="斜体"
        />
        <el-button
          :type="editor.isActive('strike') ? 'primary' : ''"
          size="small"
          :icon="'Close'"
          @click="editor.chain().focus().toggleStrike().run()"
          title="删除线"
        />
        <el-button
          :type="editor.isActive('code') ? 'primary' : ''"
          size="small"
          :icon="'Document'"
          @click="editor.chain().focus().toggleCode().run()"
          title="行内代码"
        />
      </div>

      <el-divider direction="vertical" />

      <div class="toolbar-group">
        <el-button
          :type="editor.isActive('heading', { level: 1 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          title="标题1"
        >
          H1
        </el-button>
        <el-button
          :type="editor.isActive('heading', { level: 2 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          title="标题2"
        >
          H2
        </el-button>
        <el-button
          :type="editor.isActive('heading', { level: 3 }) ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          title="标题3"
        >
          H3
        </el-button>
      </div>

      <el-divider direction="vertical" />

      <div class="toolbar-group">
        <el-button
          :type="editor.isActive('bulletList') ? 'primary' : ''"
          size="small"
          :icon="'List'"
          @click="editor.chain().focus().toggleBulletList().run()"
          title="无序列表"
        />
        <el-button
          :type="editor.isActive('orderedList') ? 'primary' : ''"
          size="small"
          @icon="'List'"
          @click="editor.chain().focus().toggleOrderedList().run()"
          title="有序列表"
        />
        <el-button
          :type="editor.isActive('blockquote') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleBlockquote().run()"
          title="引用"
        >
          <el-icon><Quote /></el-icon>
        </el-button>
        <el-button
          :type="editor.isActive('codeBlock') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          title="代码块"
        >
          <el-icon><DocumentCopy /></el-icon>
        </el-button>
      </div>

      <el-divider direction="vertical" />

      <div class="toolbar-group">
        <el-button
          :type="editor.isActive('textAlign', 'left') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().setTextAlign('left').run()"
          title="左对齐"
        >
          <el-icon><AlignLeft /></el-icon>
        </el-button>
        <el-button
          :type="editor.isActive('textAlign', 'center') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().setTextAlign('center').run()"
          title="居中"
        >
          <el-icon><AlignCenter /></el-icon>
        </el-button>
        <el-button
          :type="editor.isActive('textAlign', 'right') ? 'primary' : ''"
          size="small"
          @click="editor.chain().focus().setTextAlign('right').run()"
          title="右对齐"
        >
          <el-icon><AlignRight /></el-icon>
        </el-button>
      </div>

      <el-divider direction="vertical" />

      <div class="toolbar-group">
        <el-button
          size="small"
          :icon="'Picture'"
          @click="insertImage"
          title="插入图片"
        />
        <el-button
          size="small"
          :icon="'Link'"
          @click="addLink"
          title="插入链接"
        />
        <el-button
          size="small"
          @click="editor.chain().focus().setHorizontalRule().run()"
          title="分隔线"
        >
          <el-icon><Minus /></el-icon>
        </el-button>
      </div>

      <el-divider direction="vertical" />

      <div class="toolbar-group">
        <el-button
          size="small"
          :icon="'RefreshLeft'"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          title="撤销"
        />
        <el-button
          size="small"
          :icon="'RefreshRight'"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          title="重做"
        />
      </div>
    </div>

    <!-- Editor Content -->
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { ElMessage } from 'element-plus'

const props = withDefaults(
  defineProps<{
    modelValue: string
    editable?: boolean
    placeholder?: string
  }>(),
  {
    editable: true,
    placeholder: '请输入内容...'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    }),
    Image.configure({
      inline: true,
      allowBase64: true
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty'
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none'
    }
  },
  editable: props.editable,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
    emit('update', html)
  }
})

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue, false)
    }
  }
)

// Insert image from local file
const insertImage = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning('图片大小不能超过 5MB')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (editor.value) {
          editor.value.chain().focus().setImage({ src }).run()
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      ElMessage.error('图片读取失败')
    }
  }
  input.click()
}

// Add link
const addLink = () => {
  const url = window.prompt('请输入链接地址:')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style lang="scss">
.rich-text-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: $border-radius-base;
  overflow: hidden;
  background-color: var(--el-bg-color);

  .editor-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $spacing-xs;
    padding: $spacing-sm;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-bg-color-page);

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;

      .el-button {
        padding: 5px 8px;

        &.el-button--primary {
          background-color: var(--el-color-primary-light-9);
          border-color: var(--el-color-primary);
          color: var(--el-color-primary);
        }
      }
    }

    .el-divider--vertical {
      height: 24px;
      margin: 0 8px;
    }
  }

  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-base;

    :deep(.ProseMirror) {
      outline: none;
      min-height: 100%;

      > * + * {
        margin-top: 0.75em;
      }

      // Headings
      h1 {
        font-size: 2em;
        font-weight: 700;
        margin-top: 1em;
        margin-bottom: 0.5em;
      }

      h2 {
        font-size: 1.5em;
        font-weight: 600;
        margin-top: 0.8em;
        margin-bottom: 0.4em;
      }

      h3 {
        font-size: 1.25em;
        font-weight: 600;
        margin-top: 0.6em;
        margin-bottom: 0.3em;
      }

      // Lists
      ul,
      ol {
        padding-left: 1.5em;
        margin: 0.5em 0;

        li {
          margin: 0.25em 0;
        }
      }

      // Code block
      pre {
        background-color: var(--el-fill-color-light);
        border-radius: $border-radius-base;
        padding: $spacing-base;
        font-family: 'Courier New', monospace;
        overflow-x: auto;

        code {
          background-color: transparent;
          padding: 0;
          font-size: 0.875em;
        }
      }

      // Inline code
      code {
        background-color: var(--el-fill-color);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: 'Courier New', monospace;
        font-size: 0.875em;
      }

      // Blockquote
      blockquote {
        border-left: 4px solid var(--el-color-primary);
        padding-left: $spacing-base;
        margin: $spacing-base 0;
        color: var(--el-text-color-secondary);
        font-style: italic;
      }

      // Horizontal rule
      hr {
        border: none;
        border-top: 2px solid var(--el-border-color);
        margin: $spacing-lg 0;
      }

      // Links
      a {
        color: var(--el-color-primary);
        text-decoration: underline;
        cursor: pointer;

        &:hover {
          color: var(--el-color-primary-light-3);
        }
      }

      // Images
      img {
        max-width: 100%;
        height: auto;
        border-radius: $border-radius-base;
        margin: $spacing-base 0;
      }

      // Text alignment
      .text-align-left {
        text-align: left;
      }

      .text-align-center {
        text-align: center;
      }

      .text-align-right {
        text-align: right;
      }

      // Placeholder
      p.is-editor-empty:first-child::before {
        color: var(--el-text-color-placeholder);
        content: attr(data-placeholder);
        float: left;
        pointer-events: none;
        height: 0;
      }
    }
  }
}
</style>
