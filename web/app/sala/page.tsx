      {/* BARRA IN BASSO */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>
          <span>Credito residuo</span>
          <span style={{ color: (data.profile.credito_secondi || 0) <= 120 ? '#EF476F' : (data.profile.credito_secondi || 0) <= 300 ? '#F5A623' : '#06D6A0', fontWeight: 600 }}>
            {Math.floor((data.profile.credito_secondi || 0) / 60)}:{((data.profile.credito_secondi || 0) % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, ((data.profile.credito_secondi || 0) / 990) * 100)}%`, height: '100%', background: (data.profile.credito_secondi || 0) <= 120 ? '#EF476F' : (data.profile.credito_secondi || 0) <= 300 ? '#F5A623' : '#06D6A0', transition: 'width 1s linear' }} />
        </div>
      </div>
