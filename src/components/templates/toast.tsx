import React from 'react'
import { Toaster } from '../ui/sonner'
import { toast } from 'sonner'

type ToastTemplateProps = {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  className?: string
}

export default function ToastTemplate({ position, className }: ToastTemplateProps) {
  return <Toaster richColors theme="light" position={position} className={`bg-white ${className}`} />
}

// interface ToastAction {
//   label: string;
//   onClick: () => void;
//   style?: React.CSSProperties;
// }

// interface CancelableToastProps {
//   label: string;
//   actions: ToastAction[];
// }

// export const CancelableToast = ({ label, actions }: CancelableToastProps) => {
//   toast.custom(() => (
//     <div
//       className=' z-[100] md:max-w-[420px] flex justify-between w-full py-2 bg-white items-center shadow-lg transition-all'
//     // style={{
//     //   display: 'flex',
//     //   justifyContent: 'space-between',
//     //   alignItems: 'center',
//     //   padding: '1rem',
//     //   border: '1px solid #ddd',
//     //   borderRadius: '8px',
//     //   backgroundColor: '#fff',
//     //   boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
//     // }}
//     >
//       <span className='w-3/5 bytewave-paragraph flex'>{label}</span>
//       <div style={{ display: 'flex', gap: '0.5rem' }} className='w-2/5 flex justify-end'>
//         {actions.map((action, index) => (
//           <ButtonTemplate textclassname='bytewave-paragraph' key={index} isText text={action.label} handleClick={action.onClick} classname='-mt-0 py-1 px-6 h-6' />
//           // <button
//           //   key={index}
//           //   onClick={action.onClick}
//           //   style={{
//           //     // padding: '0.5rem 1rem',
//           //     borderRadius: '5px',
//           //     border: 'none',
//           //     cursor: 'pointer',
//           //     ...action.style,
//           //   }}
//           // >
//           //   {action.label}
//           // </button>
//         ))}
//       </div>
//     </div>
//   ));
// };

interface CancelableToastProps {
  label: string
  action: () => void
}

export const CancelableToast = ({ label, action }: CancelableToastProps) => {
  return toast.loading(label, {
    action: {
      label: 'Cancel',
      onClick: action,
    },
    actionButtonStyle: { backgroundColor: '#0865AC' },
  })
}

// export function cancelablePromise<T>(asyncFn?: (data?: unknown) => Promise<T>) {
//   let rejected = false
//   const { promise, resolve, reject } = Promise.withResolvers<T>()

//   return {
//     run: () => {
//       if (!rejected) {
//         asyncFn?.().then(resolve, reject)
//       }
//       return promise
//     },

//     cancel: () => {
//       rejected = true
//       reject(new Error('CanceledError'))
//     },
//   }
// }
