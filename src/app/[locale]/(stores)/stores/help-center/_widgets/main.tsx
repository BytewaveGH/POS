import React from 'react'

const Main = () => {
  return (
    <div>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
        {/* Support Center Banner */}
        <div className="w-full max-w-[90%] bg-white mt-6 p-6 shadow-md rounded-lg text-center">
          <div className="flex items-center justify-center gap-3">
            <img src="#" alt="logo" className="w-12 h-12 rounded-full" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">ByteWave Support Center</h1>
            <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg">+ Create a request</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Main
