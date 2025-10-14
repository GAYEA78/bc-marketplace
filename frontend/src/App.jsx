import './App.css';

function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>BC Marketplace</h1>
        <p>The exclusive place for Boston College students to buy and sell.</p>
      </header>
      <main className="main-content">
        <a 
          href="http://127.0.0.1:8000/auth/google/login" 
          className="google-button"
        >
          Sign in with Google
        </a>
        <p className="sub-text">A valid @bc.edu email is required.</p>
      </main>
    </div>
  );
}

export default App;