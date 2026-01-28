import React, { useState } from 'react'

function ImagePanel({ session }) {
  const [showGallery, setShowGallery] = useState(false)

  const currentImage = session?.currentImage
  const allImages = (session?.images || []).filter(img => img.url)

  if (!session?.active) {
    return null
  }

  return (
    <div className="card image-panel">
      <div className="card-header purple">
        Scene
        {allImages.length > 1 && (
          <button
            onClick={() => setShowGallery(!showGallery)}
            style={{
              float: 'right',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            {showGallery ? 'Current' : `Gallery (${allImages.length})`}
          </button>
        )}
      </div>
      <div className="card-body">
        {showGallery ? (
          <div className="image-gallery">
            {allImages.map((img, i) => (
              <div key={i} className="gallery-item">
                <img
                  src={img.url}
                  alt={img.prompt}
                  title={img.prompt}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(img.url, '_blank')}
                />
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.75rem' }}>
                  {img.prompt?.substring(0, 60)}...
                </div>
              </div>
            ))}
          </div>
        ) : currentImage ? (
          <div className="scene-image">
            <img
              src={currentImage}
              alt="Current scene"
              style={{
                width: '100%',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => window.open(currentImage, '_blank')}
            />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
              Click to enlarge
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--parchment)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: '#999',
            fontStyle: 'italic'
          }}>
            Ask the DM to describe something to see it illustrated
          </div>
        )}
      </div>
    </div>
  )
}

export default ImagePanel
