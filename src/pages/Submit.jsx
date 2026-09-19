import { useEffect, useState } from 'react'
import { getRunners, submitRun } from '../lib/api.js'
import Header from '../components/Header.jsx'
import RunForm from '../components/RunForm.jsx'

export default function Submit() {
  const [runners, setRunners] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getRunners().then(setRunners).catch(console.error)
  }, [])

  return (
    <>
      <Header />
      <div className="form-page">
        <h2>Submit a Run</h2>
        <p className="subtitle">Submitted runs will be reviewed before appearing on the site.</p>

        {submitted ? (
          <div className="success-msg">
            <h3>Submitted!</h3>
            <p>Your run has been sent for review. It will appear on the site once approved.</p>
            <button className="btn-primary" style={{ marginTop: '20px', maxWidth: '200px' }} onClick={() => setSubmitted(false)}>
              Submit another
            </button>
          </div>
        ) : (
          <RunForm
            runners={runners}
            requireLink
            submitLabel="Submit Run"
            busyLabel="Submitting…"
            onSubmit={async data => { await submitRun(data); setSubmitted(true) }}
          />
        )}
      </div>
    </>
  )
}
