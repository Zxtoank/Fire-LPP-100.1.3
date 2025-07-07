
import { redirect } from 'next/navigation'

export default function SignUpPage() {
  // The new passwordless flow consolidates login and signup.
  // We can just redirect any traffic from /signup to /login.
  redirect('/login')
}
