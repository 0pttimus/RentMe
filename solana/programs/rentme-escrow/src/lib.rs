use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("GCNQKEZyJVa3qUMJSNv7o8C48GuHcvBbaYscer4ccEk");

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub tenant: Pubkey,
    pub worker: Pubkey,
    pub owner: Pubkey,
    pub nonce: u64,
    pub fee_bps: u16,
    pub commitment_amount: u64,
    pub fee_collector: Pubkey,
    pub escrow_token_account: Pubkey,
    pub amount: u64,
    pub is_active: bool,
    pub worker_done: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(tenant: Pubkey, worker: Pubkey, nonce: u64, fee_bps: u16, commitment_amount: u64)]
pub struct InitEscrow<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", owner.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkDone<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.owner.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
        constraint = escrow.is_active @ EscrowError::NotActive,
        constraint = !escrow.worker_done @ EscrowError::AlreadyMarkedDone,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(constraint = worker.key() == escrow.worker @ EscrowError::NotWorker)]
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct Confirm<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.owner.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
        constraint = escrow.is_active @ EscrowError::NotActive,
        constraint = escrow.worker_done @ EscrowError::WorkerNotDone,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(constraint = tenant.key() == escrow.tenant @ EscrowError::NotTenant)]
    pub tenant: Signer<'info>,
    #[account(mut, constraint = worker_token_account.owner == escrow.worker)]
    pub worker_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_token_account.owner == escrow.fee_collector)]
    pub fee_token_account: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.escrow_token_account)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.owner.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump,
        constraint = escrow.is_active @ EscrowError::NotActive,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(constraint = worker.key() == escrow.worker @ EscrowError::NotWorker)]
    pub worker: Signer<'info>,
    #[account(mut, constraint = tenant_token_account.owner == escrow.tenant)]
    pub tenant_token_account: Account<'info, TokenAccount>,
    #[account(mut, address = escrow.escrow_token_account)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[program]
pub mod rentme_escrow {
    use super::*;

    pub fn init_escrow(
        ctx: Context<InitEscrow>,
        tenant: Pubkey,
        worker: Pubkey,
        nonce: u64,
        fee_bps: u16,
        commitment_amount: u64,
        fee_collector: Pubkey,
        escrow_token_account: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.tenant = tenant;
        escrow.worker = worker;
        escrow.owner = ctx.accounts.owner.key();
        escrow.nonce = nonce;
        escrow.fee_bps = fee_bps;
        escrow.commitment_amount = commitment_amount;
        escrow.fee_collector = fee_collector;
        escrow.escrow_token_account = escrow_token_account;
        escrow.amount = amount;
        escrow.is_active = true;
        escrow.worker_done = false;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.bump = ctx.bumps.escrow;
        Ok(())
    }

    pub fn mark_done(ctx: Context<MarkDone>) -> Result<()> {
        ctx.accounts.escrow.worker_done = true;
        Ok(())
    }

    pub fn confirm(ctx: Context<Confirm>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let owner = escrow.owner;
        let nonce = escrow.nonce;
        let bump = escrow.bump;
        let total = ctx.accounts.escrow_token_account.amount;
        // ponytail: commitment_amount stores the full price, fee is on the full price
        let fee = (escrow.commitment_amount as u128)
            .checked_mul(escrow.fee_bps as u128)
            .and_then(|v| v.checked_div(10000))
            .map(|v| v as u64)
            .unwrap_or(0);
        let to_worker = total.checked_sub(fee).unwrap_or(0);

        if to_worker > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.escrow_token_account.to_account_info(),
                        to: ctx.accounts.worker_token_account.to_account_info(),
                        authority: ctx.accounts.escrow.to_account_info(),
                    },
                    &[&[b"escrow", owner.as_ref(), &nonce.to_le_bytes(), &[bump]] as &[_]],
                ),
                to_worker,
            )?;
        }
        if fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.escrow_token_account.to_account_info(),
                        to: ctx.accounts.fee_token_account.to_account_info(),
                        authority: ctx.accounts.escrow.to_account_info(),
                    },
                    &[&[b"escrow", owner.as_ref(), &nonce.to_le_bytes(), &[bump]] as &[_]],
                ),
                fee,
            )?;
        }

        ctx.accounts.escrow.is_active = false;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let owner = ctx.accounts.escrow.owner;
        let nonce = ctx.accounts.escrow.nonce;
        let bump = ctx.accounts.escrow.bump;
        let total = ctx.accounts.escrow_token_account.amount;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.tenant_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                &[&[b"escrow", owner.as_ref(), &nonce.to_le_bytes(), &[bump]] as &[_]],
            ),
            total,
        )?;

        ctx.accounts.escrow.is_active = false;
        Ok(())
    }
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is not active")]
    NotActive,
    #[msg("Only the worker can call this")]
    NotWorker,
    #[msg("Only the tenant can call this")]
    NotTenant,
    #[msg("Work already marked done")]
    AlreadyMarkedDone,
    #[msg("Worker has not marked done yet")]
    WorkerNotDone,
}
