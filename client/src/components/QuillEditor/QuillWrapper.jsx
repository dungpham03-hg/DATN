import React, { useEffect, useState } from 'react';

const QuillWrapper = ({ value, onChange, ...props }) => {
  const [EditorComp, setEditorComp] = useState(null);
  useEffect(() => {
    // Dynamically import ReactQuill to avoid SSR issues
    const loadQuill = async () => {
      try {
        // Import ReactQuill dynamically (handle different export styles)
        const mod = await import('react-quill');
        const ReactQuill = mod?.default?.default || mod?.default || mod?.ReactQuill || mod;
        
        // Import CSS dynamically (from quill package to avoid missing path in older react-quill)
        await import('quill/dist/quill.snow.css');
        
        // Save to local state to trigger rerender
        if (typeof ReactQuill === 'function' || (ReactQuill && typeof ReactQuill === 'object' && (ReactQuill.render || ReactQuill.$$typeof))) {
          setEditorComp(() => ReactQuill);
        } else {
          console.warn('react-quill export không phải component hợp lệ:', ReactQuill);
          setEditorComp(null);
        }
      } catch (error) {
        console.error('Failed to load Quill:', error);
      }
    };
    
    loadQuill();
  }, []);

  // Fallback textarea if Quill is not loaded
  if (!EditorComp) {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical'
        }}
        placeholder="Nhập nội dung biên bản..."
        {...props}
      />
    );
  }

  return (
    <EditorComp
      value={value}
      onChange={onChange}
      modules={{
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['link', 'image'],
          ['clean']
        ],
      }}
      formats={[
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'indent', 'align',
        'link', 'image'
      ]}
      style={{
        backgroundColor: 'white',
        minHeight: '200px'
      }}
      {...props}
    />
  );
};

export default QuillWrapper;
