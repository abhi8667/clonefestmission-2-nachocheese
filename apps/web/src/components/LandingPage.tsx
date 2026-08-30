import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full overflow-hidden">

      {/* =====================================================
    TOP NAVIGATION
===================================================== */}

<header className="mt-5 absolute top-0 left-0 right-0 z-30 px-8 lg:px-8 py-4 font-mono">
  <nav className="mx-auto max-w-7xl flex items-center justify-between gap-5">

    {/* LEFT: BRAND */}
    <button
      onClick={() => navigate('/landing')}
      aria-label="Triarc - Go to Landing"
      className="
        flex items-center gap-3
        text-left
        p-1
        group
        transition-all
        focus:outline-none
      "
    >
      {/* Logo */}
      <div
        className="
          relative
          w-8 h-8
          bg-white
          flex items-center justify-center
          border border-white
          group-hover:bg-[#B497CF]
          group-hover:border-[#B497CF]
          transition-colors
        "
      >
        <span className="text-sm font-bold text-[#10091D]">
          T
        </span>

        {/* Status indicator */}
        <span
          className="
            absolute
            -top-1
            -right-1
            w-2 h-2
            bg-[#B497CF]
            shadow-[0_0_8px_rgba(180,151,207,0.8)]
          "
        />
      </div>

      {/* Brand text */}
      <div className="flex flex-col">

        <div className="flex items-center gap-2">
          <span
            className="
              font-bold
              tracking-[0.12em]
              text-sm
              text-white
              uppercase
            "
          >
            TRIARC
          </span>

          <span
            className="
              text-[9px]
              uppercase
              font-bold
              px-1.5
              py-0.5
              bg-white/10
              text-white/80
              border
              border-white/20
              tracking-wider
            "
          >
            FLOW
          </span>
        </div>

        <span
          className="
            text-[9px]
            text-white/35
            tracking-wider
            uppercase
            hidden sm:inline
          "
        >
          INCIDENT LIFECYCLE
        </span>

      </div>
    </button>


    {/* CENTER: SYSTEM STATUS */}
    <div className="hidden md:flex items-center gap-2">

      <div
        className="
          ml-6
          flex items-center gap-2
          px-3 py-1.5
          border border-white/10
          bg-white/[0.025]
          text-[10px]
          uppercase
          tracking-wider
        "
      >
        <span
          className="
            w-1.5 h-1.5
            bg-[#B497CF]
            shadow-[0_0_8px_rgba(180,151,207,0.8)]
          "
        />

        <span className="text-white/45">
          SYSTEM
        </span>

        <span className="text-white/75 font-bold">
          ONLINE
        </span>
      </div>

      <div
        className="
          px-3 py-1.5
          border border-white/10
          bg-white/[0.025]
          text-[10px]
          uppercase
          tracking-wider
          text-white/35
        "
      >
        V2.0
      </div>

    </div>


    {/* RIGHT: AUTH ACTIONS */}
    <div className="flex items-center gap-2">

      {/* Sign in */}
      <button
        onClick={() => navigate('/login')}
        className="
          px-3.5
          py-2
          text-[11px]
          font-mono
          uppercase
          tracking-wider
          text-white/50
          border
          border-transparent
          hover:text-white
          hover:border-white/15
          hover:bg-white/[0.04]
          transition-all
        "
      >
        Sign in
      </button>


      {/* Get Started */}
      <button
        onClick={() => navigate('/login')}
        className="
          group
          flex items-center gap-2
          px-3.5 py-2
          bg-white
          text-[#10091D]
          border border-white
          text-[11px]
          font-mono
          font-bold
          uppercase
          tracking-wider
          transition-all
          hover:bg-[#B497CF]
          hover:border-[#B497CF]
        "
      >
        <span>
          Get started
        </span>

        <span className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </button>

    </div>

  </nav>
</header>


      {/* =====================================================
          CENTER HERO
      ===================================================== */}

      <section
        className="
          relative
          z-10
          flex
          min-h-screen
          items-center
          justify-center
          px-6
        "
      >

        <div className="flex max-w-4xl flex-col items-center text-center">

          {/* Small status indicator
          <div
            className="
              mb-12
              flex
              items-center
              gap-2
              rounded-full
              border
              border-white/10
              bg-white/[0.035]
              px-4
              py-2
              backdrop-blur-xl
            "
          >
            <span
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-[#B497CF]
                shadow-[0_0_10px_rgba(180,151,207,0.9)]
              "
            />

            <span
              className="
                text-[10px]
                uppercase
                tracking-[0.28em]
                text-white/45
              "
            >
              Intelligent issue management
            </span>
          </div> */}


          {/* Main TRIARC wordmark */}
          <h1
            className="
              select-none
              text-[clamp(4.5rem,14vw,7rem)]
              font-light
              leading-[0.8]
              tracking-[-0.07em]
              text-white
              cinzel
              mt-20
            "
            // style={{
            //   fontFamily:
            //     '"Space Grotesk", "Inter", system-ui, sans-serif',
            // }}
          >
            TRIARC
          </h1>


          {/* Accent line */}
          <div
            className="
              mt-10
              h-px
              w-24
              bg-gradient-to-r
              from-transparent
              via-[#B497CF]/70
              to-transparent
            "
          />


          {/* Tagline */}
          <p
  className="
    mt-8
    max-w-xl
    text-[8px]
    leading-6
    tracking-wide
    text-white/50
    sm:text-sm
  "
>
  A focused workspace for tracking,
  understanding, and resolving what matters.
</p>


          {/* Primary CTA */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">

            <button
              onClick={() => navigate('/login')}
              className="
                group
                flex
                items-center
                justify-center
                rounded-xl
                bg-white
                px-7
                py-3.5
                text-sm
                font-semibold
                text-[#10091D]
                shadow-[0_10px_50px_rgba(255,255,255,0.12)]
                transition-all
                hover:-translate-y-0.5
                hover:shadow-[0_15px_60px_rgba(255,255,255,0.18)]
              "
            >
              Enter TriArc

              <span
                className="
                  ml-2
                  transition-transform
                  group-hover:translate-x-1
                "
              >
                →
              </span>
            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          BOTTOM MICROCOPY
      ===================================================== */}

      <div
        className="
          absolute
          bottom-7
          left-0
          right-0
          z-20
          flex
          justify-center
          px-6
        "
      >
        <p
          className="
            text-[9px]
            uppercase
            tracking-[0.35em]
            text-white/20
          "
        >
          Built for clarity · Designed for focus
        </p>
      </div>

    </main>
  );
};