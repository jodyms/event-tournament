'use client';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import { Alignment, Autoformat, AutoImage, AutoLink, Base64UploadAdapter, BlockQuote, Bold, Bookmark, ClassicEditor, Code, CodeBlock, Emoji, EmojiPicker, Essentials, FindAndReplace, FontBackgroundColor, FontColor, FontFamily, FontSize, Fullscreen, Heading, Highlight, HorizontalLine, HtmlEmbed, Image, ImageCaption, ImageInsert, ImageInsertViaUrl, ImageResize, ImageStyle, ImageToolbar, ImageUpload, Indent, IndentBlock, Italic, Link, LinkImage, List, ListProperties, MediaEmbed, Mention, PageBreak, Paragraph, PasteFromOffice, RemoveFormat, SelectAll, ShowBlocks, SourceEditing, SpecialCharacters, SpecialCharactersEssentials, Strikethrough, Subscript, Superscript, Table, TableCaption, TableCellProperties, TableColumnResize, TableProperties, TableToolbar, TextPartLanguage, TodoList, Underline, WordCount } from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

const plugins = [Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Code, FontSize, FontFamily, FontColor, FontBackgroundColor, Highlight, Alignment, List, ListProperties, TodoList, Indent, IndentBlock, Link, AutoLink, Bookmark, BlockQuote, Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageUpload, ImageInsert, ImageInsertViaUrl, AutoImage, LinkImage, Base64UploadAdapter, Table, TableToolbar, TableProperties, TableCellProperties, TableCaption, TableColumnResize, MediaEmbed, HorizontalLine, CodeBlock, HtmlEmbed, SpecialCharacters, SpecialCharactersEssentials, PageBreak, RemoveFormat, FindAndReplace, SelectAll, SourceEditing, ShowBlocks, Fullscreen, Emoji, EmojiPicker, Mention, TextPartLanguage, Autoformat, PasteFromOffice, WordCount];

export default function CkEditorField({ initial, onChange }: { initial: string; onChange: (value: string) => void }) {
  return <CKEditor editor={ClassicEditor} data={initial} onChange={(_event, editor) => onChange(editor.getData())} config={{
    licenseKey: 'GPL',
    plugins,
    toolbar: { shouldNotGroupWhenFull: true, items: ['undo', 'redo', 'selectAll', 'findAndReplace', 'removeFormat', '|', 'heading', '|', 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', 'highlight', '|', 'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'code', '|', 'alignment', '|', 'bulletedList', 'numberedList', 'todoList', 'outdent', 'indent', '|', 'link', 'bookmark', 'blockQuote', '|', 'insertImage', 'insertTable', 'mediaEmbed', 'horizontalLine', 'codeBlock', 'htmlEmbed', 'specialCharacters', 'emoji', 'pageBreak', '|', 'textPartLanguage', 'sourceEditing', 'showBlocks', 'fullscreen'] },
    heading: { options: [{ model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' }, { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' }, { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' }, { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }, { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }] },
    list: { properties: { styles: true, startIndex: true, reversed: true } },
    link: { addTargetToExternalLinks: true },
    image: { toolbar: ['imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|', 'toggleImageCaption', 'imageTextAlternative', '|', 'linkImage', 'resizeImage'] },
    table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties', 'toggleTableCaption'] },
  }} />;
}
